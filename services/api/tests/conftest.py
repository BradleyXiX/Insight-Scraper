"""Shared pytest setup for the API tests.

The application uses flat module imports (`import config`, `from auth import ...`), so
the source directory is added to `sys.path` before any application module is imported.

Tests run against a file-backed SQLite database. `DATABASE_URL` must be set before
`db` is imported because the engine is created at module import time. PostgreSQL-only
behaviour (RLS, `SET LOCAL`) is skipped when the URL is SQLite; the test suite covers
application logic, not database policy.
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

_TEST_DIR = Path(tempfile.mkdtemp(prefix="insight-scraper-tests-"))

_DATABASE_URL = f"sqlite:///{(_TEST_DIR / 'api.db').as_posix()}"


def _apply_test_env() -> None:
    """Force a hermetic test environment.

    Called before the application imports and again afterwards, because `config` and
    `db` call `load_dotenv()` at import time. Without the second call a developer's
    repo-level `.env` would leak `DEV_BYPASS_AUTH` and live Stripe keys into the run.
    """
    os.environ["ENVIRONMENT"] = "development"
    for key in ("DEV_BYPASS_AUTH", "DEV_TENANT_ID", "ALLOWED_ORIGINS"):
        os.environ.pop(key, None)
    os.environ["CLERK_FRONTEND_API"] = ""
    os.environ["STRIPE_SECRET_KEY"] = ""
    os.environ["STRIPE_WEBHOOK_SECRET"] = ""
    os.environ["DATABASE_URL"] = _DATABASE_URL


_apply_test_env()

import config  # noqa: E402
import db as db_module  # noqa: E402

_apply_test_env()

import jobs as jobs_module  # noqa: E402
import main  # noqa: E402
from models import Base  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_database():
    """Give every test an empty schema and a clean in-process job registry."""
    Base.metadata.drop_all(bind=db_module.engine)
    Base.metadata.create_all(bind=db_module.engine)
    jobs_module._running.clear()
    jobs_module._tasks.clear()
    yield
    main.app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def authed_client(client: TestClient) -> TestClient:
    """A client with authentication stubbed to a fixed tenant.

    Entitlement is still evaluated, so tests enable the local bypass with `local_mode`.
    """
    main.app.dependency_overrides[main.verify_clerk_token] = lambda: "test_tenant"
    return client


@pytest.fixture
def local_mode(monkeypatch) -> None:
    """Enable the development auth bypass so entitlement checks pass."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("DEV_BYPASS_AUTH", "true")
    monkeypatch.setenv("DEV_TENANT_ID", "local_operator")


@pytest.fixture
def no_auto_start(monkeypatch) -> list[str]:
    """Record jobs that would have been scheduled instead of running a worker.

    Tests that drive `execute_job` themselves use this so the request handler does not
    start a competing task.
    """
    started: list[str] = []
    monkeypatch.setattr(jobs_module, "start_job", started.append)
    return started


@pytest.fixture
def scripted_worker(monkeypatch):
    """Replace the subprocess runner with a scripted coroutine.

    Returns a setter: `scripted_worker(leads)` for a successful run, or
    `scripted_worker(error=jobs_module...)`-style by passing an exception instance.
    """

    def _install(result=None, error: Exception | None = None, recorder: dict | None = None):
        if callable(result) and error is None:
            monkeypatch.setattr(jobs_module, "run_worker_async", result)
            return result

        async def _run(query, region, source, limit, timeout_seconds, on_process=None):
            if recorder is not None:
                recorder.update(
                    {
                        "query": query,
                        "region": region,
                        "source": source,
                        "limit": limit,
                        "timeout": timeout_seconds,
                    }
                )
            if error is not None:
                raise error
            return result if result is not None else []

        monkeypatch.setattr(jobs_module, "run_worker_async", _run)
        return _run

    return _install


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    """Keep imported modules from leaking configuration into later test runs."""
    if config.dev_bypass_requested():
        os.environ.pop("DEV_BYPASS_AUTH", None)
    shutil.rmtree(_TEST_DIR, ignore_errors=True)
