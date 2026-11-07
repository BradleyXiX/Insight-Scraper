import os
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# `db` can be imported directly (for example by `init_db.py`) before `config`, so
# load the local `.env` here as well. Existing variables are never overridden.
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/foundry"
)

_IS_SQLITE = DATABASE_URL.startswith("sqlite")

# SQLite connections are bound to the thread that created them. FastAPI's TestClient
# dispatches requests from a worker thread, so allow cross-thread use in tests.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _IS_SQLITE else {},
)
SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, expire_on_commit=False
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _set_tenant(db, tenant_id: str) -> None:
    if not _IS_SQLITE:
        db.execute(
            text("SET LOCAL app.current_tenant = :tenant_id"),
            {"tenant_id": tenant_id},
        )


@contextmanager
def tenant_session(tenant_id: str):
    """Provide a session scoped to one tenant.

    On PostgreSQL, `SET LOCAL app.current_tenant` activates the RLS policies. SQLite
    has no RLS, so tests fall back to explicit `tenant_id` filters in the queries.
    """
    db = SessionLocal()
    try:
        _set_tenant(db, tenant_id)
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def admin_session():
    """Session for internal job bookkeeping that must read across tenant rows.

    The RLS policies explicitly allow the `admin` tenant value. Application endpoints
    still filter by the authenticated tenant id; this context only exists so the job
    runner can update a row before it knows which tenant owns it.
    """
    db = SessionLocal()
    try:
        if not _IS_SQLITE:
            db.execute(text("SET LOCAL app.current_tenant = 'admin'"))
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
