from pathlib import Path
import pytest
from sqlalchemy import text

from db import tenant_session
from models import Lead, ScrapeJob


def test_jobs_module_does_not_reference_admin_session():
    jobs_path = Path(__file__).resolve().parents[1] / "src" / "jobs.py"
    source = jobs_path.read_text(encoding="utf-8")
    assert "admin_session" not in source, "jobs.py must not reference admin_session"


@pytest.mark.postgres
def test_policy_has_no_admin_branch():
    with tenant_session("tenant_a") as db:
        rows = db.execute(
            text(
                """
                SELECT policyname, qual
                  FROM pg_policies
                 WHERE tablename IN ('subscriptions', 'leads', 'scrape_jobs', 'workspace_settings')
                """
            )
        ).fetchall()
        assert len(rows) > 0, "Expected policies on tenant tables"
        for policyname, qual in rows:
            assert "admin" not in (qual or ""), f"Policy {policyname} contains admin branch: {qual}"


@pytest.mark.postgres
def test_tenant_a_cannot_read_tenant_b(postgres_app_role):
    with tenant_session("tenant_b") as db:
        db.execute(text(f"SET LOCAL ROLE {postgres_app_role}"))
        lead_b = Lead(
            tenant_id="tenant_b",
            business_name="Business B",
            search_query="test",
        )
        db.add(lead_b)
        db.commit()

    with tenant_session("tenant_a") as db:
        db.execute(text(f"SET LOCAL ROLE {postgres_app_role}"))
        leads = db.query(Lead).all()
        assert len(leads) == 0


@pytest.mark.postgres
def test_tenant_a_cannot_read_tenant_b_by_direct_select(postgres_app_role):
    with tenant_session("tenant_b") as db:
        db.execute(text(f"SET LOCAL ROLE {postgres_app_role}"))
        lead_b = Lead(
            tenant_id="tenant_b",
            business_name="Secret B",
            search_query="test",
        )
        db.add(lead_b)
        db.commit()
        b_id = lead_b.id

    with tenant_session("tenant_a") as db:
        db.execute(text(f"SET LOCAL ROLE {postgres_app_role}"))
        result = db.execute(
            text("SELECT * FROM leads WHERE id = :id"),
            {"id": b_id},
        ).fetchall()
        assert len(result) == 0
