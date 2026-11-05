import sys
import subprocess
import json
import os
import asyncio
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import verify_clerk_token, is_dev_bypass
from db import get_db, tenant_session
from sqlalchemy.orm import Session
from models import Lead, SearchHistory
import stripe_service

app = FastAPI(title="Insight Scraper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _run_scraper_subprocess(query: str, region: str = "US", source: str = "gmaps", limit: int = 25) -> list:
    """Runs the international scraper worker in a separate process."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    worker_path = os.path.join(current_dir, 'scraper_worker.py')
    
    cmd = [
        sys.executable,
        "-u",
        worker_path,
        "--query", query,
        "--region", region,
        "--source", source,
        "--limit", str(limit)
    ]

    try:
        output = subprocess.check_output(cmd, text=True)
        output_clean = output.strip()
        if output_clean.startswith("[") and output_clean.endswith("]"):
            leads = json.loads(output_clean)
        else:
            # Fallback search for JSON array block in case of any preamble
            start_idx = output_clean.find("[")
            end_idx = output_clean.rfind("]")
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                leads = json.loads(output_clean[start_idx:end_idx+1])
            else:
                leads = []
        return leads
    except subprocess.CalledProcessError as e:
        print(f"Worker process encountered an error: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Failed to parse scraper worker output: {e}", file=sys.stderr)
        return []

@app.post("/api/scrape")
async def start_scrape(
    query: str, 
    region: str = "US",
    source: str = "gmaps",
    limit: int = 25,
    tenant_id: str = Depends(verify_clerk_token), 
    db: Session = Depends(get_db)
):
    """
    Endpoint to trigger an international scraping job across regions (US, GB, AU, CA, AE, KE).
    Accepts: query, region, source (gmaps, duckduckgo-places, yellowpages-intl), and limit.
    Bypasses Stripe checks when DEV_BYPASS_AUTH=true.
    """
    # 1. Check Stripe Status (bypassed if DEV_BYPASS_AUTH is active)
    if not is_dev_bypass():
        sub_status = stripe_service.get_tenant_status(db, tenant_id)
        if sub_status not in ["active", "trialing"]:
            raise HTTPException(
                status_code=402, 
                detail=f"Payment required. Current subscription status: {sub_status}"
            )
        
    # 2. Run Worker Subprocess
    leads_data = await asyncio.to_thread(_run_scraper_subprocess, query, region, source, limit)
        
    if not leads_data:
        return {"message": "No leads found or error occurred.", "leads": []}
        
    # 3. Save Leads with tenant_id using RLS session
    with tenant_session(tenant_id) as session:
        # Save Search History
        history = SearchHistory(tenant_id=tenant_id, query=f"[{region}][{source}] {query}")
        session.add(history)
        
        # Save Leads tagged with tenant_id
        saved_leads = []
        for lead in leads_data:
            contact_val = lead.get("Contact") or lead.get("Phone") or "Hidden"
            extras = []
            if lead.get("Email/Socials") and lead.get("Email/Socials") != "N/A":
                extras.append(lead.get("Email/Socials"))
            if lead.get("PageSpeed Score") and lead.get("PageSpeed Score") != "N/A":
                extras.append(f"Speed: {lead.get('Mobile Load Time', '')} ({lead.get('PageSpeed Score')})")
            if extras:
                contact_val = f"{contact_val} | " + " | ".join(extras)

            db_lead = Lead(
                tenant_id=tenant_id,
                business_name=lead.get("Business Name", "N/A"),
                contact=contact_val,
                phone=lead.get("Phone", ""),
                email=lead.get("Email", ""),
                socials=lead.get("Socials", ""),
                website=lead.get("Website", ""),
                search_query=query,
                region=region.upper(),
                has_chatbot_widget=bool(lead.get("Has_Chatbot_Widget", False)),
                mobile_load_ms=int(lead.get("Mobile_Load_Ms", 0) or 0),
                pitch_hook=lead.get("Pitch_Hook", "")
            )
            session.add(db_lead)
            saved_leads.append(db_lead)
            
        session.commit()
        
        return {
            "message": f"Successfully scraped and saved {len(saved_leads)} leads for {region}.",
            "total_leads": len(saved_leads),
            "region": region.upper(),
            "source": source,
            "leads": leads_data
        }

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Endpoint for Stripe to send webhook events."""
    return await stripe_service.process_webhook(request, db)

class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str

@app.post("/api/checkout")
async def create_checkout(
    request: CheckoutRequest,
    tenant_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db)
):
    """Creates a Stripe Checkout Session for the authenticated tenant."""
    return {"url": stripe_service.create_checkout_session(
        db, tenant_id, request.price_id, request.success_url, request.cancel_url
    )}

@app.get("/api/leads")
async def get_leads(
    tenant_id: str = Depends(verify_clerk_token)
):
    """
    Retrieves leads for the authenticated tenant.
    Demonstrates RLS in action: the query automatically uses the tenant session.
    """
    with tenant_session(tenant_id) as session:
        leads = session.query(Lead).order_by(Lead.created_at.desc()).limit(200).all()
        return [
            {
                "id": l.id,
                "business_name": l.business_name,
                "contact": l.contact,
                "phone": getattr(l, "phone", "") or l.contact or "",
                "email": getattr(l, "email", "") or "",
                "socials": getattr(l, "socials", "") or "",
                "website": l.website or "",
                "query": l.search_query or "",
                "region": getattr(l, "region", "US") or "US",
                "has_chatbot_widget": bool(getattr(l, "has_chatbot_widget", False)),
                "mobile_load_ms": getattr(l, "mobile_load_ms", 0) or 0,
                "pitch_hook": getattr(l, "pitch_hook", "") or "",
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in leads
        ]

@app.get("/health")
def health_check():
    """Health check endpoint for container orchestrators (Render, Docker, etc.)."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
