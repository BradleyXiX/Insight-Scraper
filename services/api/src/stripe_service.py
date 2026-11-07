import os

import stripe
from fastapi import HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from models import Subscription

# Never fall back to a placeholder key: a missing key must fail visibly, not silently
# authenticate against a fake Stripe configuration.
_stripe_api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
if _stripe_api_key:
    stripe.api_key = _stripe_api_key


def get_tenant_status(db: Session, tenant_id: str) -> str:
    """Return the stored subscription status for a tenant, or 'inactive'."""
    subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    if not subscription:
        return "inactive"
    return subscription.status


async def process_webhook(request: Request, db: Session):
    """Process an incoming Stripe webhook for subscription updates."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if not webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="Stripe webhooks are not configured on this API.",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    db.execute(text("SET LOCAL app.current_tenant = 'admin'"))

    if event["type"] in ("customer.subscription.created", "customer.subscription.updated"):
        handle_subscription_update(db, event["data"]["object"])
    elif event["type"] == "customer.subscription.deleted":
        handle_subscription_deleted(db, event["data"]["object"])
    elif event["type"] == "invoice.payment_failed":
        handle_payment_failed(db, event["data"]["object"])

    return {"status": "success"}


def handle_subscription_update(db: Session, subscription_data: dict):
    stripe_customer_id = subscription_data.get("customer")
    status = subscription_data.get("status")
    stripe_sub_id = subscription_data.get("id")

    metadata = subscription_data.get("metadata", {})
    tenant_id = metadata.get("tenant_id")

    if tenant_id:
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if sub:
            sub.status = status
            sub.stripe_subscription_id = stripe_sub_id
        else:
            db.add(
                Subscription(
                    tenant_id=tenant_id,
                    stripe_customer_id=stripe_customer_id,
                    stripe_subscription_id=stripe_sub_id,
                    status=status,
                )
            )
        db.commit()


def handle_subscription_deleted(db: Session, subscription_data: dict):
    stripe_sub_id = subscription_data.get("id")
    sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
    if sub:
        sub.status = "canceled"
        db.commit()


def handle_payment_failed(db: Session, invoice_data: dict):
    stripe_sub_id = invoice_data.get("subscription")
    if stripe_sub_id:
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == stripe_sub_id)
            .first()
        )
        if sub:
            # A grace period belongs here once billing is a supported path.
            sub.status = "past_due"
            db.commit()
