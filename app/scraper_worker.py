import asyncio
import sys

# set Windows selector policy as early as possible
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import random
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def _scrape_leads_async(search_query):
    leads = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        await page.goto("https://www.yellowpageskenya.com/search?q=" + search_query)
        await asyncio.sleep(random.uniform(3, 6))
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')
        for business in soup.select('.business-card')[:10]:
            name = business.select_one('.name').text.strip() if business.select_one('.name') else "N/A"
            phone = business.select_one('.phone').text.strip() if business.select_one('.phone') else "Hidden"
            leads.append({"Business Name": name, "Contact": phone})
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
