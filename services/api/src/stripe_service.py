import os
import stripe
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from models import Subscription

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_123")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_123")

def get_tenant_status(db: Session, tenant_id: str) -> str:
    """
    Retrieves the current subscription status for a given tenant.
    """
    subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    if not subscription:
        return "inactive"
    return subscription.status

async def process_webhook(request: Request, db: Session):
    """
    Processes incoming Stripe webhooks for subscription updates.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'customer.subscription.created' or event['type'] == 'customer.subscription.updated':
        subscription_data = event['data']['object']
        handle_subscription_update(db, subscription_data)
        
    elif event['type'] == 'customer.subscription.deleted':
        subscription_data = event['data']['object']
        handle_subscription_deleted(db, subscription_data)
        
    elif event['type'] == 'invoice.payment_failed':
        invoice_data = event['data']['object']
        handle_payment_failed(db, invoice_data)

    return {"status": "success"}

def handle_subscription_update(db: Session, subscription_data: dict):
    stripe_customer_id = subscription_data.get('customer')
    status = subscription_data.get('status')
    stripe_sub_id = subscription_data.get('id')
    
    # Ideally, the tenant_id would be passed in the subscription metadata
    metadata = subscription_data.get('metadata', {})
    tenant_id = metadata.get('tenant_id')
    
    if tenant_id:
        sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if sub:
            sub.status = status
            sub.stripe_subscription_id = stripe_sub_id
        else:
            new_sub = Subscription(
                tenant_id=tenant_id,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_sub_id,
                status=status
            )
            db.add(new_sub)
        db.commit()

def handle_subscription_deleted(db: Session, subscription_data: dict):
    stripe_sub_id = subscription_data.get('id')
    sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
    if sub:
        sub.status = "canceled"
        db.commit()

def handle_payment_failed(db: Session, invoice_data: dict):
    stripe_sub_id = invoice_data.get('subscription')
    if stripe_sub_id:
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
        if sub:
            # Implement 3-day grace period logic here if needed, 
            # for now we'll mark as past_due
            sub.status = "past_due"
            db.commit()
