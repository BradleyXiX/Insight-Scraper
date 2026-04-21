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

def get_nairobi_leads(search_query: str) -> pd.DataFrame:
    """
    Executes the scraper worker in a separate process for the specified query.
    
    Args:
        search_query (str): The industry or niche to search for.
        
    Returns:
        pd.DataFrame: A DataFrame containing the extracted business leads.
    """
    try:
        output = subprocess.check_output([
            sys.executable,
            "-u",
            "%s" % (__file__.replace('main.py', 'scraper_worker.py')),
            search_query
        ], text=True)
        leads = json.loads(output)
    except subprocess.CalledProcessError as e:
        print(f"Worker process encountered an error: {e}", file=sys.stderr)
        leads = []
        
    return pd.DataFrame(leads)

if __name__ == "__main__":
    df = get_nairobi_leads("Law Firms")
    print(df)