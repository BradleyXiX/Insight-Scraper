import asyncio
import json
import os
import subprocess
import sys
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import config
import stripe_service
from auth import verify_clerk_token
from db import engine, get_db, tenant_session
from models import Lead, SearchHistory

Region = Literal["US", "GB", "AU", "CA", "AE", "KE"]
Source = Literal["gmaps", "duckduckgo-places", "yellowpages-intl"]

SCRAPE_TIMEOUT_SECONDS = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "300"))


class ScraperError(RuntimeError):
    """The worker process ran but did not produce usable output."""


class ScraperTimeout(ScraperError):
    """The worker exceeded SCRAPE_TIMEOUT_SECONDS."""


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.validate_startup()
    yield


app = FastAPI(title="Insight Scraper API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _run_scraper_subprocess(
    query: str,
    region: str = "US",
    source: str = "gmaps",
    limit: int = 25,
) -> list:
    """Run the scraper worker in a separate process and return its leads.

    Raises ScraperError when the worker fails or emits unparseable output, so the API
    can distinguish "the scrape broke" from "the scrape found nothing".
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    worker_path = os.path.join(current_dir, "scraper_worker.py")

    cmd = [
        sys.executable,
        "-u",
        worker_path,
        "--query",
        query,
        "--region",
        region,
        "--source",
        source,
        "--limit",
        str(limit),
    ]

    try:
        output = subprocess.check_output(
            cmd,
            text=True,
            timeout=SCRAPE_TIMEOUT_SECONDS,
            stderr=subprocess.PIPE,
        )
    except subprocess.TimeoutExpired as exc:
        raise ScraperTimeout(
            f"The scrape exceeded the {SCRAPE_TIMEOUT_SECONDS}s time limit."
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or "").strip().splitlines()
        reason = detail[-1] if detail else "the worker exited with an error"
        raise ScraperError(reason) from exc

    output_clean = output.strip()
    if not output_clean:
        raise ScraperError("the worker returned no output")

    if output_clean.startswith("[") and output_clean.endswith("]"):
        payload = output_clean
    else:
        start_idx = output_clean.find("[")
        end_idx = output_clean.rfind("]")
        if start_idx == -1 or end_idx <= start_idx:
            raise ScraperError("the worker returned output that was not a lead list")
        payload = output_clean[start_idx : end_idx + 1]

    try:
        leads = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ScraperError("the worker returned malformed lead data") from exc

    if not isinstance(leads, list):
        raise ScraperError("the worker returned an unexpected data shape")

    return leads


@app.post("/api/scrape")
async def start_scrape(
    query: str = Query(min_length=config.MIN_QUERY_LENGTH, max_length=config.MAX_QUERY_LENGTH),
    region: Region = Query(default="US"),
    source: Source = Query(default="gmaps"),
    limit: int = Query(default=25, ge=1, le=config.MAX_LEAD_LIMIT),
    tenant_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
):
    """Run one scrape for the authenticated tenant.

    Rejects invalid input with 422, a missing subscription with 402, an unconfigured
    billing system with 503, and worker failures with 502. A successful run that
    found nothing returns 200 with `status: "empty"`.
    """
    if not config.dev_bypass_enabled():
        if not config.billing_configured():
            raise HTTPException(
                status_code=503,
                detail="Billing is not configured on this API. Contact the operator.",
            )
        sub_status = stripe_service.get_tenant_status(db, tenant_id)
        if sub_status not in ("active", "trialing"):
            raise HTTPException(
                status_code=402,
                detail=f"Payment required. Current subscription status: {sub_status}",
            )

    try:
        leads_data = await asyncio.to_thread(
            _run_scraper_subprocess, query, region, source, limit
        )
    except ScraperTimeout as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except ScraperError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"The extraction worker failed: {exc}",
        ) from exc

    with tenant_session(tenant_id) as session:
        history = SearchHistory(tenant_id=tenant_id, query=f"[{region}][{source}] {query}")
        session.add(history)

        if not leads_data:
            session.commit()
            return {
                "status": "empty",
                "message": (
                    "The scrape completed but found no matching businesses. "
                    "Try a different query, region or source."
                ),
                "total_leads": 0,
                "region": region,
                "source": source,
                "leads": [],
            }

        saved_leads = []
        for lead in leads_data:
            contact_val = lead.get("Contact") or lead.get("Phone") or "Hidden"
            extras = []
            if lead.get("Email/Socials") and lead.get("Email/Socials") != "N/A":
                extras.append(lead.get("Email/Socials"))
            if extras:
                contact_val = f"{contact_val} | " + " | ".join(extras)

            session.add(
                Lead(
                    tenant_id=tenant_id,
                    business_name=lead.get("Business Name", "N/A"),
                    contact=contact_val,
                    phone=lead.get("Phone", ""),
                    email=lead.get("Email", ""),
                    socials=lead.get("Socials", ""),
                    website=lead.get("Website", ""),
                    search_query=query,
                    region=region,
                    has_chatbot_widget=bool(lead.get("Has_Chatbot_Widget", False)),
                    mobile_load_ms=int(lead.get("Mobile_Load_Ms", 0) or 0),
                    pitch_hook=lead.get("Pitch_Hook", ""),
                )
            )
            saved_leads.append(lead)

        session.commit()

        return {
            "status": "ok",
            "message": f"Scraped and saved {len(saved_leads)} leads for {region}.",
            "total_leads": len(saved_leads),
            "region": region,
            "source": source,
            "leads": leads_data,
        }


@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Endpoint for Stripe to send webhook events."""
    return await stripe_service.process_webhook(request, db)


@app.get("/api/leads")
async def get_leads(tenant_id: str = Depends(verify_clerk_token)):
    """Return the most recent leads for the authenticated tenant."""
    with tenant_session(tenant_id) as session:
        leads = session.query(Lead).order_by(Lead.created_at.desc()).limit(200).all()
        return [
            {
                "id": lead.id,
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
            for lead in leads
        ]


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
