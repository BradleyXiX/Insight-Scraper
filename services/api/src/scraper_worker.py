"""
Isolated web scraper worker for Insight Scraper.

Utilizes Playwright and BeautifulSoup to asynchronously navigate directories
and extract business leads. This script is intended to be executed as a 
subprocess to prevent asyncio event loop conflicts in the main application.
"""
import asyncio
import json
import random
import sys
import urllib.parse

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

async def _scrape_leads_async(search_query: str) -> list[dict[str, str]]:
    """
    Asynchronously scrape business listings for a given query.
    
    Args:
        search_query (str): The search term to query on the directory.
        
    Returns:
        list[dict[str, str]]: A list of dictionaries containing Name, Contact, and Website.
    """
    leads = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        encoded_query = urllib.parse.quote(search_query)
        await page.goto("https://yellowpageskenya.com/search-results/" + encoded_query)
        
        # Give the page time to load completely
        await asyncio.sleep(random.uniform(3, 6))
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        # Yellow Pages Kenya updated their site to Next.js/Tailwind CSS. 
        # The old 'div.card' no longer works. We find cards by locating h2 tags.
        cards = []
        for h2 in soup.find_all('h2'):
            card = h2.find_parent('div', class_='bg-white')
            if card and card not in cards and card.select_one('a[href^="tel:"]'):
                cards.append(card)

        for business in cards[:10]:
            # 1. Get Name
            name_el = business.select_one('h2')
            name = name_el.text.strip() if name_el else "N/A"
            
            # 2. Get Phone
            phone_el = business.select_one('a[href^="tel:"]')
            if phone_el and phone_el.has_attr('href'):
                phone = phone_el['href'].replace('tel:', '')
            else:
                phone = "Hidden"
                
            # 3. Get Website (NEW)
            website = ""
            for a_tag in business.select('a[href]'):
                href = a_tag['href']
                if href.startswith('http') and 'yellowpageskenya' not in href:
                    website = href
                    break
            
            leads.append({
                "Business Name": name, 
                "Contact": phone,
                "Website": website
            })
            
        await browser.close()
    return leads

if __name__ == '__main__':
    # read query from command-line argument
    if len(sys.argv) < 2:
        print("[]")
        sys.exit(0)
    query = sys.argv[1]
    leads = asyncio.run(_scrape_leads_async(query))
    # output json
    print(json.dumps(leads))