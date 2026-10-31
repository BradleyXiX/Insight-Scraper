import os
from db import engine
from models import Base
from sqlalchemy import text

def init_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Applying Row-Level Security (RLS) policies and ensuring columns...")
    with engine.begin() as connection:
        # Gracefully add new columns to leads if they don't exist
        for col_sql in [
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone VARCHAR;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS socials VARCHAR;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_chatbot_widget BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile_load_ms INTEGER DEFAULT 0;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS pitch_hook VARCHAR;",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'US';"
        ]:
            try:
                connection.execute(text(col_sql))
            except Exception:
                pass

        for table_name in ['subscriptions', 'search_history', 'leads']:
            try:
                # Enable RLS on the table
                connection.execute(text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;"))
                
                # Create or replace the policy
                connection.execute(text(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};"))
                connection.execute(text(f"""
                    CREATE POLICY tenant_isolation_policy ON {table_name}
                    USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) = 'admin');
                """))
                
                # Force RLS even for the table owner
                connection.execute(text(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;"))
            except Exception as e:
                print(f"Note: RLS configuration for {table_name}: {e}")

    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
