from datetime import timedelta
import pytest

from db import admin_session
from models import ScrapeJob
import jobs
from jobs import claim_job, heartbeat, recover_jobs, create_job, get_job, utcnow

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
    with admin_session() as db:
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

    with admin_session() as db:
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

    with admin_session() as db:
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

    with admin_session() as db:
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
    with admin_session() as db:
        j = db.get(ScrapeJob, job.id)
        j.cancel_requested = True

    counts = recover_jobs(TENANT, max_attempts=3)
    assert counts.get("cancelled") == 1

    stored = get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "cancelled"
