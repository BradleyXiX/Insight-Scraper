"""Create tables and apply Row-Level Security policies.

This runs on every API start. Every statement is idempotent: `create_all` skips
existing tables, `ADD COLUMN IF NOT EXISTS` skips existing columns, and the policy
block drops and recreates each policy.
"""

import time

from sqlalchemy import text

from db import engine
from models import Base

_IS_SQLITE = engine.url.get_backend_name() == "sqlite"

# Tables that carry a `tenant_id` and therefore participate in tenant isolation.
TENANT_TABLES = (
    "subscriptions",
    "leads",
    "scrape_jobs",
    "workspace_settings",
)

# Columns added after the first release. Older databases need them backfilled by
# the ALTER statements below; fresh databases already have them from the models.
LEAD_COLUMNS = (
    "phone VARCHAR",
    "email VARCHAR",
    "socials VARCHAR",
    "has_chatbot_widget BOOLEAN DEFAULT FALSE",
    "mobile_load_ms INTEGER DEFAULT 0",
    "pitch_hook VARCHAR",
    "region VARCHAR DEFAULT 'US'",
    "job_id VARCHAR(36)",
)


def init_db(max_retries: int = 10, retry_delay: int = 2) -> None:
    print("Connecting to database and creating tables...")
    for attempt in range(1, max_retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as exc:  # noqa: BLE001 - retry any transient connection error
            if attempt == max_retries:
                print(f"Failed to connect to database after {max_retries} attempts: {exc}")
                raise
            print(
                f"Database connection attempt {attempt}/{max_retries} failed ({exc}). "
                f"Retrying in {retry_delay}s..."
            )
            time.sleep(retry_delay)

    if _IS_SQLITE:
        # SQLite has no Row-Level Security. Local runs rely on explicit `tenant_id`
        # filters instead, so skip the policy block rather than failing every
        # statement in an aborted transaction.
        print("SQLite detected: skipping RLS policies (tenant filters still apply).")
        print("Database initialized successfully.")
        return

    print("Applying Row-Level Security (RLS) policies and ensuring columns...")
    with engine.begin() as connection:
        for column in LEAD_COLUMNS:
            try:
                connection.execute(
                    text(f"ALTER TABLE leads ADD COLUMN IF NOT EXISTS {column};")
                )
            except Exception as exc:  # noqa: BLE001 - column may already exist
                print(f"Note: could not ensure leads column '{column}': {exc}")

        for table_name in TENANT_TABLES:
            try:
                connection.execute(
                    text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
                )
                connection.execute(
                    text(
                        f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};"
                    )
                )
                # The `admin` value is reserved for internal job bookkeeping: the worker
                # updates a job row before it has an authenticated request context.
                connection.execute(
                    text(
                        f"""
                        CREATE POLICY tenant_isolation_policy ON {table_name}
                        USING (
                            tenant_id = current_setting('app.current_tenant', true)
                            OR current_setting('app.current_tenant', true) = 'admin'
                        );
                        """
                    )
                )
                # Force RLS even for the table owner.
                connection.execute(
                    text(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;")
                )
            except Exception as exc:  # noqa: BLE001 - table may not exist yet
                print(f"Note: RLS configuration for {table_name}: {exc}")

    print("Database initialized successfully.")


if __name__ == "__main__":
    init_db()
