import os
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

import config
import jobs
import stripe_service
from auth import verify_clerk_token
from db import engine, get_db, tenant_session
from models import Lead, WorkspaceSettings

Region = Literal["US", "GB", "AU", "CA", "AE", "KE"]
Source = Literal["gmaps", "duckduckgo-places", "yellowpages-intl"]

DEFAULT_SETTINGS = {
    "default_region": "US",
    "default_source": "gmaps",
    "default_limit": 25,
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.validate_startup()
    jobs.mark_stale_jobs_failed()
    yield


app = FastAPI(title="Insight Scraper API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SettingsPayload(BaseModel):
    default_region: Region
    default_source: Source
    default_limit: int = Field(ge=1, le=config.MAX_LEAD_LIMIT)


def _require_entitlement(db: Session, tenant_id: str) -> None:
    """Reject scraping when hosted billing is required but unavailable."""
    if config.dev_bypass_enabled():
        return

    if not config.billing_configured():
        raise HTTPException(
            status_code=503,
            detail="Billing is not configured on this API. Contact the operator.",
        )

    status = stripe_service.get_tenant_status(db, tenant_id)
    if status not in ("active", "trialing"):
        raise HTTPException(
            status_code=402,
            detail=f"Payment required. Current subscription status: {status}",
        )


def _serialize_lead(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "job_id": lead.job_id,
        "business_name": lead.business_name,
        "contact": lead.contact,
        "phone": getattr(lead, "phone", "") or lead.contact or "",
        "email": getattr(lead, "email", "") or "",
        "socials": getattr(lead, "socials", "") or "",
        "website": lead.website or "",
        "query": lead.search_query or "",
        "region": getattr(lead, "region", "US") or "US",
        "has_chatbot_widget": bool(getattr(lead, "has_chatbot_widget", False)),
        "mobile_load_ms": getattr(lead, "mobile_load_ms", 0) or 0,
        "pitch_hook": getattr(lead, "pitch_hook", "") or "",
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def _settings_dict(settings: WorkspaceSettings | None) -> dict:
    if settings is None:
        return dict(DEFAULT_SETTINGS)
    return {
        "default_region": settings.default_region,
        "default_source": settings.default_source,
        "default_limit": settings.default_limit,
    }


@app.post("/api/scrape", status_code=202)
async def start_scrape(
    query: str = Query(min_length=config.MIN_QUERY_LENGTH, max_length=config.MAX_QUERY_LENGTH),
    region: Region = Query(default="US"),
    source: Source = Query(default="gmaps"),
    limit: int = Query(default=25, ge=1, le=config.MAX_LEAD_LIMIT),
    tenant_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
):
    """Queue a scrape job and return immediately.

    The worker runs outside the request, so the HTTP response is not held open for the
    duration of a Chromium session. Poll `GET /api/jobs/{id}` for progress.
    """
    _require_entitlement(db, tenant_id)

    job = jobs.create_job(tenant_id, query, region, source, limit)
    jobs.start_job(job.id)

    return {"job": jobs.serialize_job(job)}


@app.get("/api/jobs")
async def list_scrape_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tenant_id: str = Depends(verify_clerk_token),
):
    """Return the tenant's run history, newest first."""
    rows, total = jobs.list_jobs(tenant_id, limit, offset)
    return {
        "jobs": [jobs.serialize_job(job) for job in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/jobs/{job_id}")
async def get_scrape_job(
    job_id: str,
    tenant_id: str = Depends(verify_clerk_token),
):
    job = jobs.get_job(tenant_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": jobs.serialize_job(job)}


@app.get("/api/jobs/{job_id}/leads")
async def get_scrape_job_leads(
    job_id: str,
    tenant_id: str = Depends(verify_clerk_token),
):
    job = jobs.get_job(tenant_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    leads = jobs.leads_for_job(tenant_id, job_id) or []
    return {
        "job": jobs.serialize_job(job),
        "leads": [_serialize_lead(lead) for lead in leads],
    }


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_scrape_job(
    job_id: str,
    tenant_id: str = Depends(verify_clerk_token),
):
    job = jobs.request_cancel(tenant_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": jobs.serialize_job(job)}


@app.post("/api/jobs/{job_id}/rerun", status_code=202)
async def rerun_scrape_job(
    job_id: str,
    tenant_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
):
    existing = jobs.get_job(tenant_id, job_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Job not found")

    _require_entitlement(db, tenant_id)

    job = jobs.create_job(
        tenant_id,
        existing.query,
        existing.region,
        existing.source,
        existing.limit,
    )
    jobs.start_job(job.id)
    return {"job": jobs.serialize_job(job)}


@app.delete("/api/jobs/{job_id}", status_code=204)
async def delete_scrape_job(
    job_id: str,
    tenant_id: str = Depends(verify_clerk_token),
):
    if not jobs.delete_job(tenant_id, job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=204)


@app.get("/api/settings")
async def get_settings(tenant_id: str = Depends(verify_clerk_token)):
    with tenant_session(tenant_id) as db:
        settings = db.get(WorkspaceSettings, tenant_id)
        return _settings_dict(settings)


@app.put("/api/settings")
async def update_settings(
    payload: SettingsPayload,
    tenant_id: str = Depends(verify_clerk_token),
):
    with tenant_session(tenant_id) as db:
        settings = db.get(WorkspaceSettings, tenant_id)
        if settings is None:
            settings = WorkspaceSettings(tenant_id=tenant_id)
            db.add(settings)

        settings.default_region = payload.default_region
        settings.default_source = payload.default_source
        settings.default_limit = payload.default_limit

        db.flush()
        return _settings_dict(settings)


@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Endpoint for Stripe to send webhook events."""
    return await stripe_service.process_webhook(request, db)


@app.get("/api/leads")
async def get_leads(tenant_id: str = Depends(verify_clerk_token)):
    """Return the most recent leads for the authenticated tenant."""
    with tenant_session(tenant_id) as db:
        leads = (
            db.query(Lead)
            .filter(Lead.tenant_id == tenant_id)
            .order_by(Lead.created_at.desc())
            .limit(200)
            .all()
        )
        return [_serialize_lead(lead) for lead in leads]


@app.get("/health")
def health_check():
    """Liveness probe. Does not touch the database."""
    return {"status": "ok"}


@app.get("/health/ready")
def readiness_check():
    """Readiness probe. Fails when the database is unreachable."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - any connection failure means not ready
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

    return {"status": "ready"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
