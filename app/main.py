import asyncio
import sys
import random
import pandas as pd
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# Set event loop policy for Windows before any async code
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def _scrape_leads_async(search_query):
    """Async function to perform web scraping."""
    leads = []
    
    async with async_playwright() as p:
        # Launch browser in headless mode for efficiency
        browser = await p.chromium.launch(headless=True)
        # Identify as a real browser to avoid instant blocks
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print(f"Searching for: {search_query}...")
        # For this example, we'll simulate hitting a directory URL
        # In a real scenario, you'd navigate to Google Maps or a Business Directory
        await page.goto("https://www.yellowpageskenya.com/search?q=" + search_query)
        
        # Human-like delay
        await asyncio.sleep(random.uniform(3, 6))

        # Grab the page source and pass it to BeautifulSoup for fast parsing
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')

        # Logic to find business cards (example classes)
        for business in soup.select('.business-card')[:10]: # Limit to 10 for testing
            name = business.select_one('.name').text.strip() if business.select_one('.name') else "N/A"
            phone = business.select_one('.phone').text.strip() if business.select_one('.phone') else "Hidden"
            
            leads.append({"Business Name": name, "Contact": phone})

        await browser.close()
    
    return leads

def get_nairobi_leads(search_query):
    """Sync wrapper for async scraping function."""
    # Always use asyncio.run() - it handles both cases correctly
    leads = asyncio.run(_scrape_leads_async(search_query))
    return pd.DataFrame(leads)

if __name__ == "__main__":
    df = get_nairobi_leads("Law Firms")
    print(df)