import os
from db import engine
from models import Base
from sqlalchemy import text

def init_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Applying Row-Level Security (RLS) policies...")
    with engine.begin() as connection:
        for table_name in ['subscriptions', 'search_history', 'leads']:
            # Enable RLS on the table
            connection.execute(text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;"))
            
            # Create or replace the policy
            connection.execute(text(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};"))
            connection.execute(text(f"""
                CREATE POLICY tenant_isolation_policy ON {table_name}
                USING (tenant_id = current_setting('app.current_tenant', true));
            """))
            # `true` in current_setting means it will return null if the setting is missing, rather than crashing
            
            # Force RLS even for the table owner. This ensures tests or local development
            # (which often connect as a superuser/owner) will still enforce RLS policies.
            connection.execute(text(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;"))

    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
