"""Scrape job lifecycle: create, execute, cancel, persist, dedupe.

Jobs live in the database so a page refresh and an API restart do not lose them.
Cancellation is in-process because the API runs a single worker process; a distributed
queue is deliberately out of scope until the hosted phase.
"""

import asyncio
import os
from datetime import datetime, timezone

from db import admin_session, tenant_session
from models import Lead, ScrapeJob
from scraper_runner import ScraperError, ScraperTimeout, run_worker_async

TERMINAL_STATUSES = {"succeeded", "empty", "failed", "cancelled"}

_running: dict[str, asyncio.subprocess.Process] = {}
_tasks: set[asyncio.Task] = set()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def serialize_job(job: ScrapeJob) -> dict:
    return {
        "id": job.id,
        "query": job.query,
        "region": job.region,
        "source": job.source,
        "limit": job.limit,
        "status": job.status,
        "cancel_requested": bool(job.cancel_requested),
        "result_count": job.result_count or 0,
        "duplicate_count": job.duplicate_count or 0,
        "error": job.error,
        "created_at": _iso(job.created_at),
        "started_at": _iso(job.started_at),
        "finished_at": _iso(job.finished_at),
    }


def create_job(
    tenant_id: str,
    query: str,
    region: str,
    source: str,
    limit: int,
) -> ScrapeJob:
    with admin_session() as db:
        job = ScrapeJob(
            tenant_id=tenant_id,
            query=query,
            region=region,
            source=source,
            limit=limit,
            status="queued",
        )
        db.add(job)
        db.flush()
        db.refresh(job)
        return job


def get_job(tenant_id: str, job_id: str) -> ScrapeJob | None:
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return None
        return job


def list_jobs(tenant_id: str, limit: int, offset: int) -> tuple[list[ScrapeJob], int]:
    with admin_session() as db:
        query = db.query(ScrapeJob).filter(ScrapeJob.tenant_id == tenant_id)
        total = query.count()
        jobs = (
            query.order_by(ScrapeJob.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return jobs, total


def delete_job(tenant_id: str, job_id: str) -> bool:
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return False
        db.query(Lead).filter(
            Lead.tenant_id == tenant_id, Lead.job_id == job_id
        ).delete(synchronize_session=False)
        db.delete(job)
        return True


def leads_for_job(tenant_id: str, job_id: str) -> list[Lead] | None:
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return None
        return (
            db.query(Lead)
            .filter(Lead.tenant_id == tenant_id, Lead.job_id == job_id)
            .order_by(Lead.id.asc())
            .all()
        )


def request_cancel(tenant_id: str, job_id: str) -> ScrapeJob | None:
    """Mark a job cancelled and terminate its worker when one is running."""
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return None

        if job.status not in TERMINAL_STATUSES:
            job.cancel_requested = True
            if job.status == "queued":
                job.status = "cancelled"
                job.finished_at = utcnow()
                job.error = "Cancelled before it started."

        was_running = job.status == "running"
        db.flush()

    process = _running.get(job_id)
    if was_running and process is not None and process.returncode is None:
        process.terminate()

    return job


def _normalise_website(value: str | None) -> str:
    website = (value or "").strip().lower()
    for prefix in ("https://", "http://"):
        if website.startswith(prefix):
            website = website[len(prefix) :]
    if website.startswith("www."):
        website = website[4:]
    return website.rstrip("/")


def _normalise_name(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


def _lead_key(lead: dict) -> tuple[str, str]:
    return (
        _normalise_website(lead.get("Website")),
        _normalise_name(lead.get("Business Name")),
    )


def _save_leads(
    tenant_id: str, job_id: str, query: str, leads: list
) -> tuple[int, int]:
    """Insert new leads and count duplicates against the tenant's existing rows."""
    with tenant_session(tenant_id) as db:
        existing = (
            db.query(Lead.website, Lead.business_name)
            .filter(Lead.tenant_id == tenant_id)
            .all()
        )
        seen = {
            (_normalise_website(website), _normalise_name(name))
            for website, name in existing
        }

        inserted = 0
        duplicates = 0

        for lead in leads:
            key = _lead_key(lead)
            if key == ("", ""):
                continue
            if key in seen:
                duplicates += 1
                continue
            seen.add(key)

            phone = lead.get("Phone", "")
            email = lead.get("Email", "")
            contact_val = lead.get("Contact") or phone or "Hidden"
            if lead.get("Email/Socials") and lead.get("Email/Socials") != "N/A":
                contact_val = f"{contact_val} | {lead['Email/Socials']}"

            db.add(
                Lead(
                    tenant_id=tenant_id,
                    job_id=job_id,
                    business_name=lead.get("Business Name", "N/A"),
                    contact=contact_val,
                    phone=phone,
                    email=email,
                    socials=lead.get("Socials", ""),
                    website=lead.get("Website", ""),
                    search_query=query,
                    region=lead.get("Region", ""),
                    has_chatbot_widget=bool(lead.get("Has_Chatbot_Widget", False)),
                    mobile_load_ms=int(lead.get("Mobile_Load_Ms", 0) or 0),
                    pitch_hook=lead.get("Pitch_Hook", ""),
                )
            )
            inserted += 1

        job = db.get(ScrapeJob, job_id)
        if job is not None:
            job.result_count = inserted
            job.duplicate_count = duplicates
            job.status = "succeeded" if inserted > 0 else "empty"
            job.finished_at = utcnow()

        return inserted, duplicates


def _finish(job_id: str, status: str, error: str | None = None) -> None:
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None:
            return
        job.status = status
        job.error = error
        job.finished_at = utcnow()


def _is_cancelled(job_id: str) -> bool:
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        return bool(job is not None and (job.cancel_requested or job.status == "cancelled"))


async def execute_job(job_id: str) -> None:
    """Run one job to completion and record the outcome."""
    with admin_session() as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.status != "queued":
            return
        if job.cancel_requested:
            job.status = "cancelled"
            job.error = "Cancelled before it started."
            job.finished_at = utcnow()
            return

        job.status = "running"
        job.started_at = utcnow()
        params = {
            "tenant_id": job.tenant_id,
            "query": job.query,
            "region": job.region,
            "source": job.source,
            "limit": job.limit,
        }

    def register(process: asyncio.subprocess.Process) -> None:
        _running[job_id] = process
        if _is_cancelled(job_id):
            process.terminate()

    timeout = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "300"))

    try:
        leads = await run_worker_async(
            params["query"],
            params["region"],
            params["source"],
            params["limit"],
            timeout_seconds=timeout,
            on_process=register,
        )
    except ScraperTimeout as exc:
        if _is_cancelled(job_id):
            _finish(job_id, "cancelled", "Cancelled by the operator.")
        else:
            _finish(job_id, "failed", str(exc))
        return
    except ScraperError as exc:
        # Terminating a cancelled worker makes it exit non-zero, which surfaces as a
        # ScraperError. Report the cancellation, not a spurious failure.
        if _is_cancelled(job_id):
            _finish(job_id, "cancelled", "Cancelled by the operator.")
        else:
            _finish(job_id, "failed", str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - a job must never stay "running"
        if _is_cancelled(job_id):
            _finish(job_id, "cancelled", "Cancelled by the operator.")
        else:
            _finish(job_id, "failed", f"Unexpected worker error: {exc}")
        return
    finally:
        _running.pop(job_id, None)

    if _is_cancelled(job_id):
        _finish(job_id, "cancelled", "Cancelled by the operator.")
        return

    try:
        _save_leads(params["tenant_id"], job_id, params["query"], leads)
    except Exception as exc:  # noqa: BLE001 - surface the save failure on the job
        _finish(job_id, "failed", f"Could not save leads: {exc}")


def start_job(job_id: str) -> None:
    """Schedule a queued job on the current event loop."""
    task = asyncio.create_task(execute_job(job_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def mark_stale_jobs_failed() -> None:
    """After a restart, no in-memory worker exists for queued/running jobs."""
    try:
        with admin_session() as db:
            db.query(ScrapeJob).filter(
                ScrapeJob.status.in_(("queued", "running"))
            ).update(
                {
                    ScrapeJob.status: "failed",
                    ScrapeJob.error: "The API restarted before this job finished.",
                    ScrapeJob.finished_at: utcnow(),
                },
                synchronize_session=False,
            )
    except Exception as exc:  # noqa: BLE001 - startup must not fail on a brand-new DB
        print(f"Note: could not mark stale jobs failed: {exc}")
