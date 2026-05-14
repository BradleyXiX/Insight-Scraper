import sys
import subprocess
import json
import os
import asyncio
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from auth import verify_clerk_token
from db import get_db, tenant_session
from sqlalchemy.orm import Session
from models import Lead, SearchHistory
import stripe_service

app = FastAPI(title="Foundry-SaaS API")

# Concurrency lock to prevent IP blocking (Reserved Concurrency = 1)
# This ensures only one scrape process happens at a time on this instance.
scrape_lock = asyncio.Lock()

def _run_scraper_subprocess(query: str) -> list:
    """Runs the scraper worker in a separate process."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    worker_path = os.path.join(current_dir, 'scraper_worker.py')
    
    try:
        output = subprocess.check_output([
            sys.executable,
            "-u",
            worker_path,
            query
        ], text=True)
        leads = json.loads(output)
        return leads
    except subprocess.CalledProcessError as e:
        print(f"Worker process encountered an error: {e}", file=sys.stderr)
        return []

@app.post("/api/scrape")
async def start_scrape(
    query: str, 
    tenant_id: str = Depends(verify_clerk_token), 
    db: Session = Depends(get_db)
):
    """
    Endpoint to trigger a scraping job.
    Requires valid Clerk authentication and an active Stripe subscription.
    """
    # 1. Check Stripe Status
    sub_status = stripe_service.get_tenant_status(db, tenant_id)
    if sub_status not in ["active", "trialing"]:
        raise HTTPException(
            status_code=402, 
            detail=f"Payment required. Current subscription status: {sub_status}"
        )
        
    # 2. Enforce Concurrency Limit
    if scrape_lock.locked():
        raise HTTPException(
            status_code=429, 
            detail="A scrape job is currently running on the server. Please try again in a few moments."
        )
        
    # Use a lock to strictly enforce concurrency limit
    async with scrape_lock:
        leads_data = await asyncio.to_thread(_run_scraper_subprocess, query)
        
    if not leads_data:
        return {"message": "No leads found or error occurred.", "leads": []}
        
    # 3. Save Leads with tenant_id using RLS session
    with tenant_session(tenant_id) as session:
        # Save Search History
        history = SearchHistory(tenant_id=tenant_id, query=query)
        session.add(history)
        
        # Save Leads tagged with tenant_id
        saved_leads = []
        for lead in leads_data:
            db_lead = Lead(
                tenant_id=tenant_id,
                business_name=lead.get("Business Name", "N/A"),
                contact=lead.get("Contact", "Hidden"),
                website=lead.get("Website", ""),
                search_query=query
            )
            session.add(db_lead)
            saved_leads.append(db_lead)
            
        session.commit()
        
        return {
            "message": f"Successfully scraped and saved {len(saved_leads)} leads.",
            "total_leads": len(saved_leads)
        }

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Endpoint for Stripe to send webhook events."""
    return await stripe_service.process_webhook(request, db)

@app.get("/api/leads")
async def get_leads(tenant_id: str = Depends(verify_clerk_token)):
    """
    Retrieves leads for the authenticated tenant.
    Demonstrates RLS in action: the query automatically uses the tenant session.
    """
    with tenant_session(tenant_id) as session:
        leads = session.query(Lead).order_by(Lead.created_at.desc()).limit(100).all()
        return [{"id": l.id, "business_name": l.business_name, "contact": l.contact, "website": l.website, "query": l.search_query} for l in leads]

# AWS Lambda compatibility
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)