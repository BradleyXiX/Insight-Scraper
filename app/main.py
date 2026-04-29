"""
Core coordinator module for Insight Scraper.

Delegates web scraping tasks to isolated subprocesses to ensure stability 
and circumvent event loop collision issues commonly encountered when 
integrating asyncio/Playwright directly within Streamlit's execution model.
"""
import sys
import subprocess
import json
import pandas as pd
import os

def get_nairobi_leads(search_query: str) -> pd.DataFrame:
    """
    Executes the scraper worker in a separate process for the specified query.
    """
    # Safely get the absolute path to scraper_worker.py in the same directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    worker_path = os.path.join(current_dir, 'scraper_worker.py')
    
    try:
        output = subprocess.check_output([
            sys.executable,
            "-u",
            worker_path,
            search_query
        ], text=True)
        leads = json.loads(output)
    except subprocess.CalledProcessError as e:
        print(f"Worker process encountered an error: {e}", file=sys.stderr)
        leads = []
        
    return pd.DataFrame(leads)

def lambda_handler(event, context):
    """
    This is what AWS triggers on a schedule.
    """
    print("Lambda woke up! Checking EventBridge payload...")
    
    # Grab the query from EventBridge, default to "Law Firms Nairobi" if empty
    query = event.get("query", "Law Firms Nairobi")
    print(f"Starting scraper for: {query}")
    
    # 1. Get ALL leads from the target industry
    df = get_nairobi_leads(query)
    
    if df.empty:
        print("No leads found at all.")
        return {'statusCode': 200, 'body': "0 leads found."}

    # 2. Filter out businesses that already have websites
    if 'Website' in df.columns:
        # Keep only rows where 'Website' is empty or NaN
        df_no_website = df[df['Website'].isna() | (df['Website'] == '')]
    else:
        print("Warning: 'Website' column missing from scraped data.")
        df_no_website = df
    
    # (Future step: Call AWS SES here to email the df_no_website.to_csv() file)
    print(f"Scrape Complete! Found {len(df)} total leads.")
    print(f"Filtered down to {len(df_no_website)} prime leads (NO WEBSITE).")
    
    return {
        'statusCode': 200,
        'body': f"Success. {len(df_no_website)} leads without websites found out of {len(df)} total for {query}."
    }

# Keep this block for local testing on your computer!
if __name__ == "__main__":
    print("Running locally...")
    test_df = get_nairobi_leads("Law Firms Nairobi")
    print("\n--- All Leads ---")
    print(test_df)
    
    print("\n--- Leads WITHOUT Websites ---")
    if 'Website' in test_df.columns:
        print(test_df[test_df['Website'].isna() | (test_df['Website'] == '')])