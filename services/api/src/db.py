import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

# Assuming PostgreSQL for the SaaS platform
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/foundry")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def tenant_session(tenant_id: str):
    """
    Provides a database session with Row-Level Security enforced for the given tenant.
    This should be used instead of get_db() whenever dealing with tenant-specific operations.
    """
    db = SessionLocal()
    try:
        # Enforce RLS by setting the current_tenant setting for this transaction
        db.execute(text("SET LOCAL app.current_tenant = :tenant_id"), {"tenant_id": tenant_id})
        yield db
    finally:
        db.close()
