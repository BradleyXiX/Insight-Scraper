"""Shared pytest setup for the API tests.

The application uses flat module imports (`import config`, `from auth import ...`), so
the source directory is added to `sys.path` before any application module is imported.
The environment is reset to development defaults first: tests must never inherit a
production flag or a real Clerk/Stripe configuration from the developer shell.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

# Import-time defaults. Individual tests override these with monkeypatch.
os.environ["ENVIRONMENT"] = "development"
os.environ.pop("DEV_BYPASS_AUTH", None)
os.environ.pop("DEV_TENANT_ID", None)
os.environ.pop("ALLOWED_ORIGINS", None)
os.environ["CLERK_FRONTEND_API"] = ""
os.environ["STRIPE_SECRET_KEY"] = ""
os.environ["STRIPE_WEBHOOK_SECRET"] = ""
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/foundry"

import config  # noqa: E402
import main  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)


@pytest.fixture
def authed_client() -> TestClient:
    """A client whose auth and database dependencies are stubbed out.

    Used for input-validation tests, which must reach parameter parsing instead of
    failing on missing Clerk configuration.
    """
    main.app.dependency_overrides[main.verify_clerk_token] = lambda: "test_tenant"
    main.app.dependency_overrides[main.get_db] = lambda: None
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


@pytest.fixture
def anonymous_scrape():
    """Allow /api/scrape to run without Clerk or a database.

    Returns a helper that installs the overrides and yields the client.
    """

    def _install(monkeypatch) -> TestClient:
        monkeypatch.setenv("DEV_BYPASS_AUTH", "true")
        main.app.dependency_overrides[main.verify_clerk_token] = lambda: "test_tenant"
        main.app.dependency_overrides[main.get_db] = lambda: None

        class FakeSession:
            def add(self, _item):
                pass

            def commit(self):
                pass

        from contextlib import contextmanager

        @contextmanager
        def fake_tenant_session(_tenant_id):
            yield FakeSession()

        monkeypatch.setattr(main, "tenant_session", fake_tenant_session)
        return TestClient(main.app)

    yield _install
    main.app.dependency_overrides.clear()


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    """Keep imported modules from leaking configuration into later test runs."""
    if config.dev_bypass_requested():
        os.environ.pop("DEV_BYPASS_AUTH", None)
