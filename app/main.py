import random
import time
import pandas as pd
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

def get_nairobi_leads(search_query):
    leads = []
    
    with sync_playwright() as p:
        # Launch browser in headless mode for efficiency
        browser = p.chromium.launch(headless=True)
        # Identify as a real browser to avoid instant blocks
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"Searching for: {search_query}...")
        # For this example, we'll simulate hitting a directory URL
        # In a real scenario, you'd navigate to Google Maps or a Business Directory
        page.goto("https://www.yellowpageskenya.com/search?q=" + search_query)
        
        # Human-like delay
        time.sleep(random.uniform(3, 6))

        # Grab the page source and pass it to BeautifulSoup for fast parsing
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')

        # Logic to find business cards (example classes)
        for business in soup.select('.business-card')[:10]: # Limit to 10 for testing
            name = business.select_one('.name').text.strip() if business.select_one('.name') else "N/A"
            phone = business.select_one('.phone').text.strip() if business.select_one('.phone') else "Hidden"
            
            leads.append({"Business Name": name, "Contact": phone})

        browser.close()
    
    return pd.DataFrame(leads)

if __name__ == "__main__":
    df = get_nairobi_leads("Law Firms")
    print(df)