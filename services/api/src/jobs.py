"""Scrape job lifecycle: create, execute, cancel, persist, dedupe.

Jobs live in the database so a page refresh and an API restart do not lose them.
Cancellation is in-process because the API runs a single worker process; a distributed
queue is deliberately out of scope until the hosted phase.
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from db import tenant_session
from logging_setup import log_event
from models import Lead, ScrapeJob
from scraper_runner import ScraperError, ScraperTimeout, run_worker_async

TERMINAL_STATUSES = {"succeeded", "empty", "failed", "cancelled"}

_running: dict[str, asyncio.subprocess.Process] = {}
_tasks: set[asyncio.Task] = set()
_SEM = asyncio.Semaphore(int(os.getenv("SCRAPE_CONCURRENCY", "1")))


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
    with tenant_session(tenant_id) as db:
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
        log_event(
            "job.queued",
            job_id=job.id,
            tenant_id=tenant_id,
            query=query,
            region=region,
            source=source,
            limit=limit,
        )
        return job


def get_job(tenant_id: str, job_id: str) -> ScrapeJob | None:
    with tenant_session(tenant_id) as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return None
        return job


def list_jobs(tenant_id: str, limit: int, offset: int) -> tuple[list[ScrapeJob], int]:
    with tenant_session(tenant_id) as db:
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
    with tenant_session(tenant_id) as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return False
        db.query(Lead).filter(
            Lead.tenant_id == tenant_id, Lead.job_id == job_id
        ).delete(synchronize_session=False)
        db.delete(job)
        return True


def leads_for_job(tenant_id: str, job_id: str) -> list[Lead] | None:
    with tenant_session(tenant_id) as db:
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
    with tenant_session(tenant_id) as db:
        job = db.get(ScrapeJob, job_id)
        if job is None or job.tenant_id != tenant_id:
            return None

        if job.status not in TERMINAL_STATUSES:
            job.cancel_requested = True
            if job.status == "queued":
                job.status = "cancelled"
                job.finished_at = utcnow()
                job.error = "Cancelled before it started."
                log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)

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
            job.lease_expires_at = None

        return inserted, duplicates


def _finish(tenant_id: str, job_id: str, status: str, error: str | None = None) -> None:
    with tenant_session(tenant_id) as db:
        job = db.get(ScrapeJob, job_id)
        if job is None:
            return
        job.status = status
        job.error = error
        job.finished_at = utcnow()
        job.lease_expires_at = None


def _is_cancelled(tenant_id: str, job_id: str) -> bool:
    with tenant_session(tenant_id) as db:
        job = db.get(ScrapeJob, job_id)
        return bool(job is not None and (job.cancel_requested or job.status == "cancelled"))


def claim_job(tenant_id: str, job_id: str, worker_id: str, lease_seconds: int) -> dict | None:
    now = utcnow()
    lease_until = now + timedelta(seconds=lease_seconds)
    with tenant_session(tenant_id) as db:
        stmt = text(
            """
            UPDATE scrape_jobs
               SET status = 'running',
                   worker_id = :worker_id,
                   lease_expires_at = :lease_until,
                   attempt = attempt + 1,
                   started_at = COALESCE(started_at, :now)
             WHERE id = :job_id
               AND status = 'queued'
               AND cancel_requested = false
            RETURNING tenant_id, query, region, source, "limit", attempt
            """
        )
        result = db.execute(
            stmt,
            {
                "worker_id": worker_id,
                "lease_until": lease_until,
                "now": now,
                "job_id": job_id,
            },
        ).mappings().first()

        if result is not None:
            log_event("job.claimed", job_id=job_id, tenant_id=tenant_id)
            return dict(result)

        cancel_stmt = text(
            """
            UPDATE scrape_jobs
               SET status = 'cancelled',
                   finished_at = :now,
                   error = 'Cancelled before it started.'
             WHERE id = :job_id
               AND status = 'queued'
               AND cancel_requested = true
            RETURNING id
            """
        )
        cancelled = db.execute(cancel_stmt, {"now": now, "job_id": job_id}).first()
        if cancelled is not None:
            log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)

        return None


def heartbeat(tenant_id: str, job_id: str, worker_id: str, lease_seconds: int) -> bool:
    now = utcnow()
    lease_until = now + timedelta(seconds=lease_seconds)
    with tenant_session(tenant_id) as db:
        stmt = text(
            """
            UPDATE scrape_jobs
               SET lease_expires_at = :lease_until
             WHERE id = :job_id
               AND worker_id = :worker_id
               AND status = 'running'
            """
        )
        res = db.execute(
            stmt,
            {
                "lease_until": lease_until,
                "job_id": job_id,
                "worker_id": worker_id,
            },
        )
        return res.rowcount > 0


def recover_jobs(tenant_id: str, max_attempts: int = 3) -> dict[str, int]:
    now = utcnow()
    requeued = 0
    failed = 0
    cancelled = 0

    with tenant_session(tenant_id) as db:
        expired_jobs = (
            db.query(ScrapeJob)
            .filter(
                ScrapeJob.tenant_id == tenant_id,
                ScrapeJob.status == "running",
                ScrapeJob.lease_expires_at < now,
            )
            .all()
        )
        for job in expired_jobs:
            if job.attempt < max_attempts:
                job.status = "queued"
                job.lease_expires_at = None
                job.worker_id = None
                requeued += 1
                log_event("job.requeued", job_id=job.id, tenant_id=tenant_id, attempt=job.attempt)
            else:
                job.status = "failed"
                job.finished_at = now
                job.lease_expires_at = None
                job.error = f"Gave up after {max_attempts} attempts."
                failed += 1
                log_event("job.failed", level=logging.WARNING, job_id=job.id, tenant_id=tenant_id, error=job.error)

        cancelled_jobs = (
            db.query(ScrapeJob)
            .filter(
                ScrapeJob.tenant_id == tenant_id,
                ScrapeJob.status == "queued",
                ScrapeJob.cancel_requested.is_(True),
            )
            .all()
        )
        for job in cancelled_jobs:
            job.status = "cancelled"
            job.finished_at = now
            job.lease_expires_at = None
            job.error = "Cancelled before it started."
            cancelled += 1
            log_event("job.cancelled", job_id=job.id, tenant_id=tenant_id)

    return {"requeued": requeued, "failed": failed, "cancelled": cancelled}


async def _heartbeat_loop(tenant_id: str, job_id: str, worker_id: str, lease_seconds: int) -> None:
    interval = max(5, lease_seconds // 4)
    while True:
        await asyncio.sleep(interval)
        try:
            ok = heartbeat(tenant_id, job_id, worker_id, lease_seconds)
            if not ok:
                break
        except Exception:
            pass


async def execute_job(job_id: str, tenant_id: str) -> None:
    """Run one job to completion and record the outcome."""
    worker_id = f"worker_{uuid.uuid4().hex[:8]}"
    lease_seconds = int(os.getenv("SCRAPE_LEASE_SECONDS", "60"))

    claim = claim_job(tenant_id, job_id, worker_id, lease_seconds)
    if claim is None:
        return

    query = claim["query"]
    region = claim["region"]
    source = claim["source"]
    limit = claim["limit"]

    log_event(
        "job.started",
        job_id=job_id,
        tenant_id=tenant_id,
        query=query,
        region=region,
        source=source,
        limit=limit,
    )

    def register(process: asyncio.subprocess.Process) -> None:
        _running[job_id] = process
        if _is_cancelled(tenant_id, job_id):
            process.terminate()

    timeout = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "300"))
    started_at = utcnow()

    heartbeat_task = asyncio.create_task(
        _heartbeat_loop(tenant_id, job_id, worker_id, lease_seconds)
    )

    try:
        async with _SEM:
            leads = await run_worker_async(
                query,
                region,
                source,
                limit,
                timeout_seconds=timeout,
                on_process=register,
            )
    except ScraperTimeout as exc:
        if _is_cancelled(tenant_id, job_id):
            _finish(tenant_id, job_id, "cancelled", "Cancelled by the operator.")
            log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)
        else:
            _finish(tenant_id, job_id, "failed", str(exc))
            log_event(
                "job.failed",
                level=logging.WARNING,
                job_id=job_id,
                tenant_id=tenant_id,
                error=str(exc),
            )
        return
    except ScraperError as exc:
        if _is_cancelled(tenant_id, job_id):
            _finish(tenant_id, job_id, "cancelled", "Cancelled by the operator.")
            log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)
        else:
            _finish(tenant_id, job_id, "failed", str(exc))
            log_event(
                "job.failed",
                level=logging.WARNING,
                job_id=job_id,
                tenant_id=tenant_id,
                error=str(exc),
            )
        return
    except Exception as exc:  # noqa: BLE001 - a job must never stay "running"
        if _is_cancelled(tenant_id, job_id):
            _finish(tenant_id, job_id, "cancelled", "Cancelled by the operator.")
            log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)
        else:
            msg = f"Unexpected worker error: {exc}"
            _finish(tenant_id, job_id, "failed", msg)
            log_event(
                "job.failed",
                level=logging.WARNING,
                job_id=job_id,
                tenant_id=tenant_id,
                error=msg,
            )
        return
    finally:
        _running.pop(job_id, None)
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

    if _is_cancelled(tenant_id, job_id):
        _finish(tenant_id, job_id, "cancelled", "Cancelled by the operator.")
        log_event("job.cancelled", job_id=job_id, tenant_id=tenant_id)
        return

    try:
        inserted, duplicates = _save_leads(tenant_id, job_id, query, leads)
        duration_ms = int((utcnow() - started_at).total_seconds() * 1000)
        status = "succeeded" if inserted > 0 else "empty"
        log_event(
            "job.finished",
            job_id=job_id,
            tenant_id=tenant_id,
            status=status,
            leads=inserted,
            duplicates=duplicates,
            duration_ms=duration_ms,
        )
    except Exception as exc:  # noqa: BLE001 - surface the save failure on the job
        msg = f"Could not save leads: {exc}"
        _finish(tenant_id, job_id, "failed", msg)
        log_event(
            "job.failed",
            level=logging.WARNING,
            job_id=job_id,
            tenant_id=tenant_id,
            error=msg,
        )


def start_job(job_id: str, tenant_id: str) -> None:
    """Schedule a queued job on the current event loop."""
    task = asyncio.create_task(execute_job(job_id, tenant_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)

