from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class Subscription(Base):
    __tablename__ = 'subscriptions'
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SearchHistory(Base):
    __tablename__ = 'search_history'
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    query = Column(String, nullable=False)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Lead(Base):
    __tablename__ = 'leads'
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)
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
    region = Column(String, default="US", nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
