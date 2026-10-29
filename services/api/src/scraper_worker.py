"""
Isolated web scraper worker for Insight Scraper.

Utilizes Playwright and BeautifulSoup to asynchronously navigate directories
or audit website URLs. This script is intended to be executed as a 
subprocess to prevent asyncio event loop conflicts in the main application.

Supports:
  --source directory : Scrapes business directories (e.g. Yellow Pages).
  --source url_list  : Audits a list of URLs, extracting business name, phone,
                       email/socials, website URL, and mobile load time / PageSpeed score
                       to pitch slow sites on Venture #2 Landing Page Sprints and
                       Venture #4 RAG Bots.
"""
import argparse
import asyncio
import json
import random
import re
import sys
import time
import urllib.parse
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

def _clean_business_name(raw_name: str, domain: str = "") -> str:
    """Cleans up raw title or site name into a concise business name."""
    if not raw_name or raw_name == "N/A":
        if domain:
            cleaned_domain = re.sub(r'^(https?://)?(www\.)?', '', domain).split('/')[0].split('.')[0]
            return cleaned_domain.capitalize()
        return "Unknown Business"
    
    # Strip common site titles like "Home - My Company | Tagline"
    parts = re.split(r'[\-\|\–\—\:]', raw_name)
    best_part = parts[0].strip()
    if len(best_part) < 3 and len(parts) > 1:
        best_part = parts[1].strip()
    return best_part[:60] if best_part else "Unknown Business"

def _extract_phone_from_soup(soup: BeautifulSoup, text: str) -> str:
    """Extracts phone number from tel: links or text."""
    tel_link = soup.select_one('a[href^="tel:"]')
    if tel_link and tel_link.get('href'):
        raw_phone = tel_link['href'].replace('tel:', '').strip()
        return urllib.parse.unquote(raw_phone)
    
    # Regex fallback for standard phone patterns
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    match = re.search(phone_pattern, text)
    if match:
        return match.group(0).strip()
    return "Hidden"

def _extract_emails_and_socials(soup: BeautifulSoup, text: str) -> tuple[str, list[str]]:
    """Extracts email addresses and social media profile URLs."""
    emails = set()
    
    # 1. Mailto links
    for a in soup.select('a[href^="mailto:"]'):
        href = a['href'].replace('mailto:', '').split('?')[0].strip()
        if href and '@' in href:
            emails.add(href.lower())
            
    # 2. Text regex
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
    for match in re.findall(email_pattern, text):
        clean_email = match.lower()
        # Filter out common asset/mock false positives
        if not re.search(r'\.(png|jpg|jpeg|gif|webp|svg|css|js)$', clean_email) and 'example.com' not in clean_email:
            emails.add(clean_email)
            
    # 3. Socials
    social_domains = [
        "facebook.com", "instagram.com", "linkedin.com", 
        "twitter.com", "x.com", "youtube.com", "tiktok.com"
    ]
    socials = set()
    for a in soup.select('a[href]'):
        href = a['href'].strip()
        for domain in social_domains:
            if domain in href:
                # Filter out share/intent URLs
                if not any(skip in href for skip in ['sharer', 'share', 'intent/tweet', 'shareArticle']):
                    socials.add(href)
                    
    primary_email = sorted(list(emails))[0] if emails else ""
    return primary_email, sorted(list(socials))

def _calculate_pagespeed_score(load_time_seconds: float) -> int:
    """
    Approximates mobile Google PageSpeed / Lighthouse performance score (0-100)
    based on mobile load time curve.
    """
    if load_time_seconds <= 1.2:
        return max(90, int(100 - (load_time_seconds / 1.2) * 10))
    elif load_time_seconds <= 3.0:
        return max(70, int(90 - ((load_time_seconds - 1.2) / 1.8) * 20))
    elif load_time_seconds <= 5.5:
        return max(45, int(70 - ((load_time_seconds - 3.0) / 2.5) * 25))
    else:
        return max(15, int(45 - min(30, (load_time_seconds - 5.5) * 5)))

async def _scrape_directory_async(search_query: str) -> list[dict[str, str]]:
    """
    Scrapes business directory listings (YellowPages Kenya).
    """
    leads = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        encoded_query = urllib.parse.quote(search_query)
        target_url = "https://yellowpageskenya.com/search-results/" + encoded_query
        
        try:
            await page.goto(target_url, timeout=30000)
            await asyncio.sleep(random.uniform(2.5, 4.5))
            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            cards = []
            for h2 in soup.find_all('h2'):
                card = h2.find_parent('div', class_='bg-white')
                if card and card not in cards and card.select_one('a[href^="tel:"]'):
                    cards.append(card)

            for business in cards[:10]:
                # 1. Business Name
                name_el = business.select_one('h2')
                name = name_el.text.strip() if name_el else "N/A"
                
                # 2. Phone
                phone_el = business.select_one('a[href^="tel:"]')
                if phone_el and phone_el.has_attr('href'):
                    phone = phone_el['href'].replace('tel:', '').strip()
                else:
                    phone = "Hidden"
                    
                # 3. Website
                website = ""
                for a_tag in business.select('a[href]'):
                    href = a_tag['href']
                    if href.startswith('http') and 'yellowpageskenya' not in href:
                        website = href
                        break

                # 4. Email/Socials from card if available
                card_text = business.get_text(separator=" ")
                email, socials = _extract_emails_and_socials(business, card_text)
                email_socials_parts = []
                if email:
                    email_socials_parts.append(f"Email: {email}")
                if socials:
                    email_socials_parts.append(f"Socials: {', '.join(socials[:2])}")
                email_socials_str = " | ".join(email_socials_parts) if email_socials_parts else "N/A"

                leads.append({
                    "Business Name": name, 
                    "Contact": phone,
                    "Phone": phone,
                    "Email": email or "N/A",
                    "Socials": ", ".join(socials) if socials else "N/A",
                    "Email/Socials": email_socials_str,
                    "Website": website,
                    "Mobile Load Time": "N/A",
                    "PageSpeed Score": "N/A",
                    "Pitch": "Venture #4 RAG Bots"
                })
        except Exception as e:
            print(f"Directory scraping error: {e}", file=sys.stderr)
        finally:
            await browser.close()
            
    return leads

async def _audit_urls_async(urls_input: str) -> list[dict[str, str]]:
    """
    Audits a list of URLs on mobile viewport, extracting:
    - Business name
    - Phone number
    - Email and social media channels
    - Website URL
    - Mobile load time and PageSpeed score
    - Pitch recommendation for Venture #2 (Landing Page Sprints) & Venture #4 (RAG Bots)
    """
    raw_tokens = [tok.strip().strip(",") for tok in re.split(r'[\s,\n]+', urls_input.strip()) if tok.strip()]
    urls = []
    for tok in raw_tokens:
        if not tok.startswith("http://") and not tok.startswith("https://"):
            tok = "https://" + tok
        urls.append(tok)
        
    leads = []
    if not urls:
        return leads

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Emulate Mobile Safari / iPhone 14
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            is_mobile=True,
            has_touch=True
        )

        for target_url in urls[:15]: # audit up to 15 sites per run
            page = await context.new_page()
            start_time = time.perf_counter()
            load_time_seconds = 0.0
            html = ""
            
            try:
                # Measure mobile load time
                response = await page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
                try:
                    await page.wait_for_load_state("load", timeout=5000)
                except Exception:
                    pass
                end_time = time.perf_counter()
                load_time_seconds = round(end_time - start_time, 2)
                
                # Check browser navigation timing if available
                perf_nav = await page.evaluate("""() => {
                    try {
                        const nav = performance.getEntriesByType('navigation')[0];
                        if (nav && nav.loadEventEnd > 0) {
                            return (nav.loadEventEnd - nav.startTime) / 1000;
                        }
                    } catch (e) {}
                    return null;
                }""")
                if perf_nav and perf_nav > 0:
                    load_time_seconds = round(perf_nav, 2)

                html = await page.content()
            except Exception as e:
                # Fallback for slow/timing-out sites
                end_time = time.perf_counter()
                load_time_seconds = round(end_time - start_time, 2)
                if load_time_seconds < 10.0:
                    load_time_seconds = 10.0
                try:
                    html = await page.content()
                except Exception:
                    html = ""

            soup = BeautifulSoup(html, 'html.parser') if html else BeautifulSoup("", 'html.parser')
            page_text = soup.get_text(separator=" ") if html else ""
            
            # 1. Business Name
            raw_title = ""
            og_site = soup.select_one('meta[property="og:site_name"]')
            if og_site and og_site.get('content'):
                raw_title = og_site['content'].strip()
            elif soup.title and soup.title.string:
                raw_title = soup.title.string.strip()
            elif soup.select_one('h1'):
                raw_title = soup.select_one('h1').text.strip()
                
            business_name = _clean_business_name(raw_title, domain=target_url)
            
            # 2. Phone
            phone = _extract_phone_from_soup(soup, page_text)
            
            # 3. Email & Socials
            email, socials = _extract_emails_and_socials(soup, page_text)
            email_socials_parts = []
            if email:
                email_socials_parts.append(f"Email: {email}")
            if socials:
                email_socials_parts.append(f"Socials: {', '.join(socials[:3])}")
            email_socials_str = " | ".join(email_socials_parts) if email_socials_parts else "N/A"
            
            # 4. Mobile Load Time & PageSpeed Score
            pagespeed_score = _calculate_pagespeed_score(load_time_seconds)
            
            # 5. Venture Pitch Strategy
            if pagespeed_score < 70 or load_time_seconds >= 3.0:
                pitch = f"Venture #2 Landing Page Sprint (Slow mobile load time: {load_time_seconds:.2f}s, Score: {pagespeed_score}/100) & Venture #4 RAG Bots"
            else:
                pitch = "Venture #4 RAG Bots (High performance site, pitch lead conversion & customer service automation)"
                
            leads.append({
                "Business Name": business_name,
                "Contact": phone if phone != "Hidden" else (email or "N/A"),
                "Phone": phone,
                "Email": email or "N/A",
                "Socials": ", ".join(socials) if socials else "N/A",
                "Email/Socials": email_socials_str,
                "Website": target_url,
                "Mobile Load Time": f"{load_time_seconds:.2f}s",
                "PageSpeed Score": f"{pagespeed_score}/100",
                "Pitch": pitch
            })
            
            await page.close()
            
        await browser.close()
        
    return leads

async def main():
    parser = argparse.ArgumentParser(description="Insight Scraper Worker")
    parser.add_argument("query", nargs="?", default="", help="Directory search query or URL(s)")
    parser.add_argument(
        "--source", 
        "-s", 
        choices=["directory", "url_list", "urls", "audit"], 
        default="directory", 
        help="Source type: directory for directory scraping, url_list for URL list auditing"
    )
    args = parser.parse_args()

    input_query = args.query.strip()
    if not input_query:
        print("[]")
        return

    # Normalize source
    source_type = args.source.lower()
    if source_type in ["url_list", "urls", "audit"]:
        leads = await _audit_urls_async(input_query)
    else:
        leads = await _scrape_directory_async(input_query)

    print(json.dumps(leads))

if __name__ == '__main__':
    asyncio.run(main())
