"""Job lifecycle: queue, execute, dedupe, cancel, history, delete, re-run."""

import asyncio

import jobs
from db import admin_session
from models import Lead, ScrapeJob

TENANT = "test_tenant"


def create_job(**overrides) -> ScrapeJob:
    params = {
        "query": "coffee shops",
        "region": "US",
        "source": "gmaps",
        "limit": 5,
    }
    params.update(overrides)
    return jobs.create_job(TENANT, **params)


def run_job(job_id: str) -> None:
    asyncio.run(jobs.execute_job(job_id))


def make_lead(name: str = "Acme Coffee", website: str = "https://acme.example") -> dict:
    return {
        "Business Name": name,
        "Website": website,
        "Phone": "555-0100",
        "Email": "hello@acme.example",
        "Socials": "",
        "Has_Chatbot_Widget": True,
        "Mobile_Load_Ms": 2100,
        "Pitch_Hook": "Slow mobile site",
    }


def job_status(job_id: str) -> str:
    job = jobs.get_job(TENANT, job_id)
    assert job is not None
    return job.status


def test_scrape_endpoint_queues_a_job(authed_client, local_mode, no_auto_start):
    response = authed_client.post(
        "/api/scrape",
        params={
            "query": "coffee shops",
            "region": "GB",
            "source": "gmaps",
            "limit": "10",
        },
    )

    assert response.status_code == 202
    job = response.json()["job"]
    assert job["status"] == "queued"
    assert job["region"] == "GB"
    assert job["limit"] == 10
    assert no_auto_start == [job["id"]]


def test_successful_job_saves_leads(authed_client, scripted_worker):
    job = create_job()
    scripted_worker([make_lead(), make_lead("Beta Cafe", "beta.example")])

    run_job(job.id)

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "succeeded"
    assert stored.result_count == 2
    assert stored.duplicate_count == 0
    assert stored.finished_at is not None

    leads = jobs.leads_for_job(TENANT, job.id)
    assert [lead.business_name for lead in leads] == ["Acme Coffee", "Beta Cafe"]
    assert all(lead.job_id == job.id for lead in leads)
    assert leads[0].search_query == "coffee shops"
    assert leads[0].mobile_load_ms == 2100
    assert leads[0].has_chatbot_widget is True


def test_job_leads_endpoint_returns_stored_leads(authed_client, scripted_worker):
    job = create_job()
    scripted_worker([make_lead()])
    run_job(job.id)

    response = authed_client.get(f"/api/jobs/{job.id}/leads")

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "succeeded"
    assert payload["leads"][0]["business_name"] == "Acme Coffee"
    assert payload["leads"][0]["job_id"] == job.id


def test_empty_result_marks_job_empty(scripted_worker):
    job = create_job()
    scripted_worker([])

    run_job(job.id)

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "empty"
    assert stored.result_count == 0


def test_worker_failure_marks_job_failed(scripted_worker):
    job = create_job()
    scripted_worker(error=jobs.ScraperError("browser crashed"))

    run_job(job.id)

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "failed"
    assert "browser crashed" in (stored.error or "")


def test_timeout_marks_job_failed(scripted_worker):
    job = create_job()
    scripted_worker(error=jobs.ScraperTimeout("took too long"))

    run_job(job.id)

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "failed"
    assert "took too long" in (stored.error or "")


def test_duplicate_leads_are_counted_not_inserted(scripted_worker):
    leads = [make_lead(), make_lead("Beta Cafe", "https://www.beta.example/")]

    first = create_job()
    scripted_worker(leads)
    run_job(first.id)

    second = create_job()
    scripted_worker(leads)
    run_job(second.id)

    stored = jobs.get_job(TENANT, second.id)
    assert stored is not None
    assert stored.status == "empty"
    assert stored.result_count == 0
    assert stored.duplicate_count == 2

    with admin_session() as db:
        assert db.query(Lead).filter(Lead.tenant_id == TENANT).count() == 2


def test_cancel_before_start_marks_cancelled():
    job = create_job()

    cancelled = jobs.request_cancel(TENANT, job.id)

    assert cancelled is not None
    assert cancelled.status == "cancelled"
    assert cancelled.cancel_requested is True
    assert "Cancelled" in (cancelled.error or "")


def test_cancel_during_run_discards_results(scripted_worker):
    job = create_job()

    async def run_then_cancel(query, region, source, limit, timeout_seconds, on_process=None):
        # The job is `running` at this point, mirroring a real cancellation request.
        jobs.request_cancel(TENANT, job.id)
        return [make_lead()]

    scripted_worker(run_then_cancel)

    run_job(job.id)

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "cancelled"
    assert jobs.leads_for_job(TENANT, job.id) == []


def test_cancel_does_not_touch_a_finished_job(scripted_worker):
    job = create_job()
    scripted_worker([make_lead()])
    run_job(job.id)

    result = jobs.request_cancel(TENANT, job.id)

    assert result is not None
    assert result.status == "succeeded"


def test_job_is_scoped_to_its_tenant(authed_client, scripted_worker):
    job = create_job()
    scripted_worker([make_lead()])
    run_job(job.id)

    assert jobs.get_job("other_tenant", job.id) is None
    assert authed_client.get("/api/jobs/does-not-exist").status_code == 404
    assert authed_client.get(f"/api/jobs/{job.id}").status_code == 200


def test_job_list_paginates(scripted_worker):
    created = [create_job().id for _ in range(3)]
    scripted_worker([])
    for job_id in created:
        run_job(job_id)

    page, total = jobs.list_jobs(TENANT, limit=2, offset=0)
    second_page, second_total = jobs.list_jobs(TENANT, limit=2, offset=2)

    assert total == 3
    assert second_total == 3
    assert len(page) == 2
    assert len(second_page) == 1


def test_delete_removes_the_job_and_its_leads(authed_client, scripted_worker):
    job = create_job()
    scripted_worker([make_lead()])
    run_job(job.id)

    response = authed_client.delete(f"/api/jobs/{job.id}")

    assert response.status_code == 204
    assert jobs.get_job(TENANT, job.id) is None
    assert jobs.leads_for_job(TENANT, job.id) is None
    with admin_session() as db:
        assert db.query(Lead).filter(Lead.job_id == job.id).count() == 0


def test_delete_rejects_another_tenants_job(authed_client):
    job = jobs.create_job("other_tenant", "coffee", "US", "gmaps", 5)

    response = authed_client.delete(f"/api/jobs/{job.id}")

    assert response.status_code == 404
    assert jobs.get_job("other_tenant", job.id) is not None


def test_rerun_copies_parameters_into_a_new_job(authed_client, local_mode, no_auto_start):
    original = create_job(query="dentists", region="CA", limit=12)

    response = authed_client.post(f"/api/jobs/{original.id}/rerun")

    assert response.status_code == 202
    rerun = response.json()["job"]
    assert rerun["id"] != original.id
    assert rerun["query"] == "dentists"
    assert rerun["region"] == "CA"
    assert rerun["limit"] == 12
    assert rerun["status"] == "queued"
    assert no_auto_start == [rerun["id"]]


def test_stale_jobs_are_failed_on_restart():
    job = create_job()

    jobs.mark_stale_jobs_failed()

    stored = jobs.get_job(TENANT, job.id)
    assert stored is not None
    assert stored.status == "failed"
    assert "restarted" in (stored.error or "")
