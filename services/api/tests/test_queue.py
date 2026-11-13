from datetime import timedelta
import asyncio
import pytest
from fastapi.testclient import TestClient

from db import tenant_session
from models import ScrapeJob
import jobs
from jobs import claim_job, heartbeat, recover_jobs, create_job, get_job, utcnow
import main

TENANT = "test_tenant"


def make_test_job(**overrides) -> ScrapeJob:
    params = {
        "query": "dentists",
        "region": "US",
        "source": "gmaps",
        "limit": 10,
    }
    params.update(overrides)
    return create_job(TENANT, **params)


def test_claim_succeeds_once_then_returns_none():
    job = make_test_job()
    claimed = claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)

    assert claimed is not None
    assert claimed["query"] == "dentists"
    assert claimed["attempt"] == 1

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "running"
    assert stored.worker_id == "worker_a"
    assert stored.lease_expires_at is not None

    second_claim = claim_job(TENANT, job.id, worker_id="worker_b", lease_seconds=60)
    assert second_claim is None


def test_claim_skips_a_cancelled_queued_job():
    job = make_test_job()
    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, job.id)
        j.cancel_requested = True

    claimed = claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)
    assert claimed is None

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "cancelled"
    assert "Cancelled" in (stored.error or "")


def test_heartbeat_extends_the_lease():
    job = make_test_job()
    claimed = claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=30)
    assert claimed is not None

    initial_job = get_job(TENANT, job.id)
    assert initial_job is not None
    initial_lease = initial_job.lease_expires_at

    ok = heartbeat(TENANT, job.id, worker_id="worker_a", lease_seconds=120)
    assert ok is True

    updated_job = get_job(TENANT, job.id)
    assert updated_job is not None
    assert updated_job.lease_expires_at > initial_lease


def test_heartbeat_rejects_a_foreign_worker():
    job = make_test_job()
    claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)

    ok = heartbeat(TENANT, job.id, worker_id="worker_b", lease_seconds=60)
    assert ok is False


def test_recover_requeues_an_expired_lease():
    job = make_test_job()
    claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)

    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, job.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1

    counts = recover_jobs(TENANT, max_attempts=3)
    assert counts.get("requeued") == 1

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "queued"
    assert stored.attempt == 1
    assert stored.lease_expires_at is None
    assert stored.worker_id is None


def test_recover_fails_after_max_attempts():
    job = make_test_job()
    claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)

    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, job.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 3

    counts = recover_jobs(TENANT, max_attempts=3)
    assert counts.get("failed") == 1

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "failed"
    assert "attempts" in (stored.error or "")


def test_recover_is_idempotent():
    job = make_test_job()
    claim_job(TENANT, job.id, worker_id="worker_a", lease_seconds=60)

    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, job.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1

    counts1 = recover_jobs(TENANT, max_attempts=3)
    assert counts1.get("requeued") == 1

    counts2 = recover_jobs(TENANT, max_attempts=3)
    assert counts2.get("requeued") == 0
    assert counts2.get("failed") == 0
    assert counts2.get("cancelled") == 0


def test_recover_releases_a_cancelled_queued_job():
    job = make_test_job()
    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, job.id)
        j.cancel_requested = True

    counts = recover_jobs(TENANT, max_attempts=3)
    assert counts.get("cancelled") == 1

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "cancelled"


def test_a_waiting_job_stays_queued_until_a_slot_frees(monkeypatch):
    """A batch item waiting for a scrape slot must still read as queued.

    Claiming before the slot is acquired marks every item in a batch as `running`
    while only one is actually scraping, which makes the progress list useless.
    """
    first = make_test_job(query="first")
    second = make_test_job(query="second")
    started: list[str] = []

    async def fake_run_worker_async(
        query, region, source, limit, timeout_seconds=0, on_process=None
    ):
        started.append(query)
        await asyncio.sleep(0.05)
        return []

    monkeypatch.setattr(jobs, "run_worker_async", fake_run_worker_async)
    monkeypatch.setattr(jobs, "_SEM", asyncio.Semaphore(1))

    async def scenario():
        task_one = asyncio.create_task(jobs.execute_job(first.id, TENANT))
        task_two = asyncio.create_task(jobs.execute_job(second.id, TENANT))
        # Let the first task take the only slot and start scraping.
        await asyncio.sleep(0.01)

        waiting = get_job(TENANT, second.id)
        assert waiting is not None
        assert waiting.status == "queued"
        assert waiting.worker_id is None

        await asyncio.gather(task_one, task_two)

    asyncio.run(scenario())

    assert started == ["first", "second"]
    assert get_job(TENANT, second.id).status == "empty"


OTHER_TENANT = "other_tenant"


def test_recovery_is_scoped_to_the_calling_tenant():
    mine = make_test_job()
    theirs = create_job(
        OTHER_TENANT, query="plumbers", region="GB", source="gmaps", limit=10
    )
    claim_job(TENANT, mine.id, worker_id="worker_a", lease_seconds=60)
    claim_job(OTHER_TENANT, theirs.id, worker_id="worker_b", lease_seconds=60)

    with tenant_session(TENANT) as db:
        j = db.get(ScrapeJob, mine.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1
    with tenant_session(OTHER_TENANT) as db:
        j = db.get(ScrapeJob, theirs.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1

    counts = recover_jobs(TENANT, max_attempts=3)
    assert counts.get("requeued") == 1

    recovered = get_job(TENANT, mine.id)
    assert recovered is not None
    assert recovered.status == "queued"

    untouched = get_job(OTHER_TENANT, theirs.id)
    assert untouched is not None
    assert untouched.status == "running"
    assert untouched.lease_expires_at is not None
    assert untouched.worker_id == "worker_b"


def test_listing_jobs_recovers_only_the_callers_tenant(client, local_mode):
    mine = create_job(
        "tenant_a", query="dentists", region="US", source="gmaps", limit=10
    )
    theirs = create_job(
        "tenant_b", query="dentists", region="US", source="gmaps", limit=10
    )
    claim_job("tenant_a", mine.id, worker_id="worker_a", lease_seconds=60)
    claim_job("tenant_b", theirs.id, worker_id="worker_b", lease_seconds=60)

    with tenant_session("tenant_a") as db:
        j = db.get(ScrapeJob, mine.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1
    with tenant_session("tenant_b") as db:
        j = db.get(ScrapeJob, theirs.id)
        j.lease_expires_at = utcnow() - timedelta(seconds=10)
        j.attempt = 1

    main.app.dependency_overrides[main.verify_clerk_token] = lambda: "tenant_a"
    response = client.get("/api/jobs")
    assert response.status_code == 200

    recovered = get_job("tenant_a", mine.id)
    assert recovered is not None
    assert recovered.status == "queued"

    untouched = get_job("tenant_b", theirs.id)
    assert untouched is not None
    assert untouched.status == "running"


def test_startup_does_not_recover_a_hardcoded_tenant(monkeypatch):
    calls: list[tuple] = []

    def spy(*args, **kwargs):
        calls.append((args, kwargs))
        return {"requeued": 0, "failed": 0, "cancelled": 0}

    monkeypatch.setattr(jobs, "recover_jobs", spy)
    with TestClient(main.app):
        pass

    assert calls == []

