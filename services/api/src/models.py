import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=_utcnow)


class ScrapeJob(Base):
    """One scrape request and its outcome. This row is also the history entry."""

    __tablename__ = "scrape_jobs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False, index=True)
    query = Column(String, nullable=False)
    region = Column(String, nullable=False)
    source = Column(String, nullable=False)
    limit = Column(Integer, nullable=False)
    # queued | running | succeeded | empty | failed | cancelled
    status = Column(String, nullable=False, default="queued", index=True)
    cancel_requested = Column(Boolean, nullable=False, default=False)
    result_count = Column(Integer, nullable=False, default=0)
    duplicate_count = Column(Integer, nullable=False, default=0)
    error = Column(String, nullable=True)
    attempt = Column(Integer, nullable=False, default=0, server_default="0")
    lease_expires_at = Column(DateTime, nullable=True)
    worker_id = Column(String, nullable=True)
    batch_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime, default=_utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"
    tenant_id = Column(String, primary_key=True)
    default_region = Column(String, nullable=False, default="US")
    default_source = Column(String, nullable=False, default="gmaps")
    default_limit = Column(Integer, nullable=False, default=25)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    job_id = Column(String(36), nullable=True, index=True)
    business_name = Column(String)
    contact = Column(String)
    website = Column(String)
    search_query = Column(String)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    socials = Column(String, nullable=True)
    has_chatbot_widget = Column(Boolean, default=False, nullable=True)
    mobile_load_ms = Column(Integer, default=0, nullable=True)
    pitch_hook = Column(String, nullable=True)
    pitch_rank = Column(Integer, nullable=True)
    region = Column(String, default="US", nullable=True)
    created_at = Column(DateTime, default=_utcnow)
