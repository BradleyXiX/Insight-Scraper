"""
Isolated web scraper worker for Insight Scraper - International Multi-Source Edition.

Supports:
  Regions : US, GB, AU, CA, AE, KE
  Sources : gmaps, duckduckgo-places, yellowpages-intl (directory), url_list (audit)
  Deep Signals : Mobile_Load_Ms (Navigation Timing), Has_Chatbot_Widget (Intercom, Drift, Tidio, Botpress, etc.),
                 Email/Social Links, Business Name, Phone, Website.
  Pitch Hooks  : If Mobile_Load_Ms > 3000 -> "Pitch $750 Speed Overhaul (#2)"
                 If Has_Chatbot_Widget == False -> "Pitch $1,000 RAG Bot (#4)"

Intended to run as a subprocess to prevent asyncio event loop conflicts with FastAPI.
Outputs JSON array directly to stdout.
"""
import argparse
import asyncio
import json
import gc
import os
import random
import re
import shutil
import sys
import time
import urllib.parse
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

import parsers

# User-Agent rotation pool
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15"
]

MOBILE_USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36"
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1366, "height": 768}
]

REGION_METADATA = {
    "US": {"locale": "en-US", "timezone": "America/New_York", "country": "United States", "default_geo": "New York, NY"},
    "GB": {"locale": "en-GB", "timezone": "Europe/London", "country": "United Kingdom", "default_geo": "London"},
    "AU": {"locale": "en-AU", "timezone": "Australia/Sydney", "country": "Australia", "default_geo": "Sydney NSW"},
    "CA": {"locale": "en-CA", "timezone": "America/Toronto", "country": "Canada", "default_geo": "Toronto, ON"},
    "AE": {"locale": "en-AE", "timezone": "Asia/Dubai", "country": "United Arab Emirates", "default_geo": "Dubai"},
    "KE": {"locale": "en-KE", "timezone": "Africa/Nairobi", "country": "Kenya", "default_geo": "Nairobi"}
}

def get_optimized_browser_args() -> list[str]:
    """
    Returns Chromium launch flags optimized for containerized, resource-constrained
    environments (such as Render's 512MB free tier and Docker containers).
    Limits memory footprint, disables hardware acceleration, disables unnecessary background
    processes, and restricts V8 JS engine heap size.
    """
    return [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--no-zygote",
        "--renderer-process-limit=1",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-web-security",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-first-run",
        "--js-flags=--max-old-space-size=256",
    ]

STEALTH_INIT_SCRIPT = """
(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
    // Chrome runtime emulation
    window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
    };
    // Mock navigator plugins
    Object.defineProperty(navigator, 'plugins', {
        get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
    });
    // Languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
    });
})();
"""

CHATBOT_DETECTION_SCRIPT = """
(() => {
    try {
        // 1. Global JS Objects
        const knownGlobals = [
            'Intercom', 'drift', 'tidioChatApi', 'botpressWebChat', 
            '$crisp', 'zE', '$zopim', 'HubSpotConversations', 
            'LiveChatWidget', '$chatwoot', 'freshchat', 'Tawk_API',
            'vwo_$', 'qualified', 'Kustomer', 'Ada', 'GorgiasChat'
        ];
        for (const g of knownGlobals) {
            if (window[g] !== undefined) return true;
        }

        // 2. DOM selectors for chatbot widget containers, iframes or root tags
        const selectors = [
            '#intercom-container', 'iframe[name*="intercom"]', 'div[class*="intercom-"]',
            '#drift-widget', 'iframe[title*="Drift"]', 'div[class*="drift-"]',
            '#tidio-chat', 'iframe[id*="tidio"]', '#tidio-chat-iframe',
            '#bp-web-widget', 'div[class*="bpw-widget"]', '#botpress-webchat',
            '#crisp-chatbox', 'div.crisp-client',
            '#launcher', '#ze-snippet', 'iframe[title*="Zendesk"]',
            '#hubspot-messages-iframe-container', 'div[data-hubspot-rendered="true"]',
            '#chat-widget-container', 'iframe#chat-widget',
            'div[class*="woot-widget"]',
            '#tawk-bubble-container', 'iframe[src*="tawk.to"]',
            '[aria-label*="chat" i]',
            '[id*="chat-widget" i]',
            '[class*="chat-widget" i]',
            'button[aria-haspopup="dialog"][aria-label*="chat" i]'
        ];
        for (const s of selectors) {
            if (document.querySelector(s)) return true;
        }

        // 3. Script sources
        const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s.src || '').toLowerCase());
        const patterns = [
            'widget.intercom.io', 'js.driftt.com', 'code.tidio.co',
            'botpress', 'client.crisp.chat', 'static.zdassets.com',
            'js.hs-scripts.com', 'livechatinc.com', 'embed.tawk.to',
            'chatwoot', 'kustomerapp.com', 'gorgias.chat'
        ];
        for (const s of scripts) {
            for (const p of patterns) {
                if (s.includes(p)) return true;
            }
        }
    } catch (e) {}
    return false;
})();
"""

def _clean_business_name(raw_name: str, domain: str = "") -> str:
    """Cleans up raw title or site name into a concise business name."""
    if not raw_name or raw_name == "N/A":
        if domain:
            cleaned_domain = re.sub(r'^(https?://)?(www\.)?', '', domain).split('/')[0].split('.')[0]
            return cleaned_domain.capitalize()
        return "Unknown Business"
    
    parts = re.split(r'[\-\|\–\—\:]', raw_name)
    best_part = parts[0].strip()
    if len(best_part) < 3 and len(parts) > 1:
        best_part = parts[1].strip()
    return best_part[:70] if best_part else "Unknown Business"

def _extract_phone_from_soup(soup: BeautifulSoup, text: str) -> str:
    """Extracts phone number from tel: links or regex patterns."""
    tel_link = soup.select_one('a[href^="tel:"]')
    if tel_link and tel_link.get('href'):
        raw_phone = tel_link['href'].replace('tel:', '').strip()
        return urllib.parse.unquote(raw_phone)
    
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}'
    match = re.search(phone_pattern, text)
    if match:
        found = match.group(0).strip()
        if len(re.sub(r'\D', '', found)) >= 7:
            return found
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
        if not re.search(r'\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2)$', clean_email) and 'example.com' not in clean_email and 'sentry.io' not in clean_email:
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
                if not any(skip in href for skip in ['sharer', 'share', 'intent/tweet', 'shareArticle', 'policy', 'terms']):
                    socials.add(href)
                    
    primary_email = sorted(list(emails))[0] if emails else ""
    return primary_email, sorted(list(socials))

def _calculate_pagespeed_score(load_time_seconds: float) -> int:
    """Approximates Google PageSpeed / Lighthouse performance score (0-100)."""
    if load_time_seconds <= 1.2:
        return max(90, int(100 - (load_time_seconds / 1.2) * 10))
    elif load_time_seconds <= 3.0:
        return max(70, int(90 - ((load_time_seconds - 1.2) / 1.8) * 20))
    elif load_time_seconds <= 5.5:
        return max(45, int(70 - ((load_time_seconds - 3.0) / 2.5) * 25))
    else:
        return max(15, int(45 - min(30, (load_time_seconds - 5.5) * 5)))

def _get_pitch_hook(website: str | None, mobile_load_ms: int, has_chatbot: bool) -> tuple[int, str]:
    """Generates the sales pitch rank and hook based on ordered signal precedence."""
    return parsers.pitch_rank_for(website, mobile_load_ms, has_chatbot)

async def _audit_website_signal(browser, target_url: str) -> dict:
    """
    Audits a website URL on a mobile viewport:
    - Measures Mobile_Load_Ms using Navigation Timing API
    - Detects Has_Chatbot_Widget (Intercom, Drift, Tidio, Botpress, etc.)
    - Extracts phone, email, and social links
    """
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    mobile_ua = random.choice(MOBILE_USER_AGENTS)
    context = await browser.new_context(
        viewport={"width": 390, "height": 844},
        user_agent=mobile_ua,
        is_mobile=True,
        has_touch=True
    )
    await context.add_init_script(STEALTH_INIT_SCRIPT)

    # Low-memory optimization: Abort heavy media, videos, and fonts to conserve memory in constrained environments
    if os.getenv("LOW_MEMORY_MODE", "true").lower() in ("true", "1", "yes"):
        async def _block_heavy_resources(route):
            if route.request.resource_type in ("image", "media", "font"):
                await route.abort()
            else:
                await route.continue_()
        await context.route("**/*", _block_heavy_resources)

    mobile_load_ms = 0
    has_chatbot = False
    phone = "Hidden"
    email = ""
    socials = []
    business_name = ""

    page = await context.new_page()
    start_time = time.perf_counter()
    html = ""
    
    try:
        response = await page.goto(target_url, wait_until="domcontentloaded", timeout=16000)
        try:
            await page.wait_for_load_state("load", timeout=4000)
        except Exception:
            pass

        end_time = time.perf_counter()
        wall_clock_ms = int((end_time - start_time) * 1000)

        # 1. Navigation Timing API
        perf_ms = await page.evaluate("""() => {
            try {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav && nav.loadEventEnd > 0) {
                    return Math.round(nav.loadEventEnd - nav.startTime);
                }
                if (nav && nav.responseEnd > 0) {
                    return Math.round(nav.responseEnd - nav.startTime);
                }
            } catch (e) {}
            try {
                if (window.performance && window.performance.timing) {
                    const t = window.performance.timing;
                    if (t.loadEventEnd > 0 && t.navigationStart > 0) {
                        return t.loadEventEnd - t.navigationStart;
                    }
                }
            } catch (e) {}
            return null;
        }""")

        mobile_load_ms = int(perf_ms) if perf_ms and perf_ms > 0 else wall_clock_ms

        # 2. Chatbot Widget Detection
        has_chatbot = bool(await page.evaluate(CHATBOT_DETECTION_SCRIPT))

        html = await page.content()
    except Exception as e:
        end_time = time.perf_counter()
        mobile_load_ms = max(3500, int((end_time - start_time) * 1000))
        try:
            html = await page.content()
        except Exception:
            html = ""
    finally:
        await page.close()
        await context.close()

    if html:
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text(separator=" ")
        phone = _extract_phone_from_soup(soup, text)
        email, socials = _extract_emails_and_socials(soup, text)

        # If email not on homepage, look for a /contact or /about link
        if not email:
            contact_link = None
            for a in soup.select('a[href]'):
                href = a['href'].lower()
                if any(k in href for k in ['contact', 'reach-us', 'about-us', 'get-in-touch']):
                    contact_link = urllib.parse.urljoin(target_url, a['href'])
                    break
            if contact_link and contact_link != target_url:
                c_page = None
                try:
                    c_page = await context.new_page()
                    await c_page.goto(contact_link, wait_until="domcontentloaded", timeout=8000)
                    c_html = await c_page.content()
                    c_soup = BeautifulSoup(c_html, 'html.parser')
                    c_text = c_soup.get_text(separator=" ")
                    c_email, c_socials = _extract_emails_and_socials(c_soup, c_text)
                    if c_email:
                        email = c_email
                    if c_socials:
                        socials = sorted(list(set(socials + c_socials)))
                    if phone == "Hidden":
                        c_phone = _extract_phone_from_soup(c_soup, c_text)
                        if c_phone != "Hidden":
                            phone = c_phone
                except Exception:
                    pass
                finally:
                    if c_page:
                        try:
                            await c_page.close()
                        except Exception:
                            pass

        raw_title = ""
        og_site = soup.select_one('meta[property="og:site_name"]')
        if og_site and og_site.get('content'):
            raw_title = og_site['content'].strip()
        elif soup.title and soup.title.string:
            raw_title = soup.title.string.strip()
        business_name = _clean_business_name(raw_title, domain=target_url)
    else:
        business_name = _clean_business_name("", domain=target_url)

    return {
        "business_name": business_name,
        "phone": phone,
        "email": email,
        "socials": socials,
        "mobile_load_ms": mobile_load_ms,
        "has_chatbot": has_chatbot
    }

async def _scrape_kenya_directory(page, search_query: str, limit: int) -> list[dict]:
    """Scrapes yellowpageskenya.com for the KE region."""
    encoded_query = urllib.parse.quote(search_query)
    target_url = f"https://yellowpageskenya.com/search-results/{encoded_query}"

    try:
        await page.goto(target_url, timeout=30000)
        await asyncio.sleep(random.uniform(2.0, 3.5))
        html = await page.content()
        return parsers.parse_kenya(html, limit=limit)
    except Exception as e:
        print(f"Kenya directory scraping error: {e}", file=sys.stderr)
        return []


async def _scrape_google_maps(page, query: str, region: str, limit: int) -> list[dict]:
    """Scrapes Google Maps Places for international queries."""
    meta = REGION_METADATA.get(region, REGION_METADATA["US"])

    # Enrich query with country if not present
    search_term = query
    if meta["country"].lower() not in query.lower() and region != "US":
        search_term = f"{query} {meta['country']}"

    encoded_query = urllib.parse.quote(search_term)
    url = f"https://www.google.com/maps/search/{encoded_query}?hl=en"

    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(2.5, 4.0))

        # Handle cookie consent dialogues if present
        for consent_btn_selector in [
            'button:has-text("Accept all")',
            'button:has-text("I agree")',
            'button:has-text("Reject all")',
            'form[action*="consent"] button',
            'button[aria-label*="Accept" i]',
        ]:
            try:
                btn = page.locator(consent_btn_selector).first
                if await btn.is_visible(timeout=1500):
                    await btn.click()
                    await asyncio.sleep(1.5)
                    break
            except Exception:
                pass

        # Locate the scrollable feed of places
        feed_selector = 'div[role="feed"]'
        try:
            await page.wait_for_selector(feed_selector, timeout=8000)
        except Exception:
            pass

        # Scroll to load up to limit items
        scroll_attempts = 0
        while scroll_attempts < 6:
            scroll_attempts += 1
            await page.evaluate("""() => {
                const feed = document.querySelector('div[role="feed"]') || window;
                feed.scrollBy(0, 1000);
            }""")
            await asyncio.sleep(1.2)

        html = await page.content()
        return parsers.parse_gmaps(html, region=region, limit=limit)
    except Exception as e:
        print(f"Google Maps scraping error: {e}", file=sys.stderr)
        return []


async def _scrape_duckduckgo_places(page, query: str, region: str, limit: int) -> list[dict]:
    """Scrapes DuckDuckGo Local / Places for business contacts and websites."""
    meta = REGION_METADATA.get(region, REGION_METADATA["US"])
    search_term = f"{query} {meta['country']}" if meta['country'].lower() not in query.lower() else query
    encoded_query = urllib.parse.quote(search_term)
    url = f"https://duckduckgo.com/?q={encoded_query}&ia=places"

    try:
        await page.goto(url, timeout=25000, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(2.0, 3.5))
        html = await page.content()
        return parsers.parse_duckduckgo(html, region=region, limit=limit)
    except Exception as e:
        print(f"DuckDuckGo Places error: {e}", file=sys.stderr)
        return []


async def _scrape_yellowpages_intl(page, query: str, region: str, limit: int) -> list[dict]:
    """Scrapes country-specific business directories (YellowPages US, Yell UK, etc.)."""
    if region == "KE":
        return await _scrape_kenya_directory(page, query, limit)

    encoded_query = urllib.parse.quote(query)

    try:
        if region == "US":
            url = f"https://www.yellowpages.com/search?search_terms={encoded_query}"
            await page.goto(url, timeout=25000, wait_until="domcontentloaded")
            await asyncio.sleep(2.0)
            html = await page.content()
            return parsers.parse_yellowpages(html, region=region, limit=limit)

        elif region == "GB":
            url = f"https://www.yell.com/ucs/UcsSearchAction.do?keywords={encoded_query}"
            await page.goto(url, timeout=25000, wait_until="domcontentloaded")
            await asyncio.sleep(2.0)
            html = await page.content()
            return parsers.parse_yellowpages(html, region=region, limit=limit)

        elif region in ["CA", "AU", "AE"]:
            # DuckDuckGo Places as verified fallback for CA, AU, AE international directories
            return await _scrape_duckduckgo_places(page, query, region, limit)

    except Exception as e:
        print(f"International YellowPages error for {region}: {e}", file=sys.stderr)

    return []

async def run_scraper(query: str, region: str = "US", source: str = "gmaps", limit: int = 25) -> list[dict]:
    """
    Main orchestration function for scraping B2B leads across regions and sources,
    followed by website deep signal analysis (Mobile Load ms, Chatbot Widget detection, email/socials).
    """
    region = region.upper()
    if region not in REGION_METADATA:
        region = "US"
    meta = REGION_METADATA[region]

    user_agent = random.choice(USER_AGENTS)
    viewport = random.choice(VIEWPORTS)

    raw_candidates = []

    # Check for camoufox / camoufox-cli fallback availability
    camoufox_available = bool(shutil.which("camoufox-cli"))
    if not camoufox_available:
        try:
            import camoufox
            camoufox_available = True
        except ImportError:
            camoufox_available = False

    async with async_playwright() as p:
        browser_launch_args = get_optimized_browser_args()

        browser = await p.chromium.launch(
            headless=True,
            args=browser_launch_args
        )

        context = await browser.new_context(
            user_agent=user_agent,
            viewport=viewport,
            locale=meta["locale"],
            timezone_id=meta["timezone"]
        )
        await context.add_init_script(STEALTH_INIT_SCRIPT)
        page = await context.new_page()

        # Route by source
        norm_source = source.lower()

        if region == "KE" or norm_source in ["yellowpageskenya", "ke"]:
            raw_candidates = await _scrape_kenya_directory(page, query, limit)
        elif norm_source in ["yellowpages-intl", "directory"]:
            raw_candidates = await _scrape_yellowpages_intl(page, query, region, limit)
        elif norm_source in ["duckduckgo-places", "ddg"]:
            raw_candidates = await _scrape_duckduckgo_places(page, query, region, limit)
        else: # Default: gmaps
            raw_candidates = await _scrape_google_maps(page, query, region, limit)

        # Multi-source cascade fallback: if primary source returned 0 or few, augment via DuckDuckGo
        if len(raw_candidates) < min(5, limit) and region != "KE":
            augmented = await _scrape_duckduckgo_places(page, query, region, limit - len(raw_candidates))
            for cand in augmented:
                if not any(c.get("Business Name") == cand.get("Business Name") for c in raw_candidates):
                    raw_candidates.append(cand)

        # Deep Signal Inspection on Prospect Websites
        final_leads = []
        for cand in raw_candidates[:limit]:
            website = cand.get("Website", "").strip()
            phone = cand.get("Phone", "Hidden")
            email = cand.get("Email", "")
            socials = cand.get("Socials", [])
            has_chatbot = False
            mobile_load_ms = 0

            if website:
                try:
                    audit_res = await _audit_website_signal(browser, website)
                    if not cand.get("Business Name") or cand.get("Business Name") == "Unknown Business":
                        cand["Business Name"] = audit_res.get("business_name") or cand["Business Name"]
                    if phone == "Hidden" and audit_res.get("phone") != "Hidden":
                        phone = audit_res["phone"]
                    if not email and audit_res.get("email"):
                        email = audit_res["email"]
                    if not socials and audit_res.get("socials"):
                        socials = audit_res["socials"]
                    has_chatbot = audit_res.get("has_chatbot", False)
                    mobile_load_ms = audit_res.get("mobile_load_ms", 0)
                except Exception as e:
                    print(f"Error auditing website {website}: {e}", file=sys.stderr)

            # Format social links and emails
            email_socials_parts = []
            if email:
                email_socials_parts.append(f"Email: {email}")
            if socials:
                email_socials_parts.append(f"Socials: {', '.join(socials[:2])}")
            email_socials_str = " | ".join(email_socials_parts) if email_socials_parts else "N/A"

            gc.collect()

            # Pitch Hook calculation
            pitch_rank, pitch_hook = _get_pitch_hook(website, mobile_load_ms, has_chatbot)
            pagespeed_score = _calculate_pagespeed_score(mobile_load_ms / 1000.0) if mobile_load_ms > 0 else 0

            final_leads.append({
                "Business Name": cand.get("Business Name", "Unknown Business"),
                "Contact": phone if phone != "Hidden" else (email or "N/A"),
                "Phone": phone,
                "Email": email or "N/A",
                "Socials": ", ".join(socials) if socials else "N/A",
                "Email/Socials": email_socials_str,
                "Website": website,
                "Region": region,
                "Has_Chatbot_Widget": has_chatbot,
                "Mobile_Load_Ms": mobile_load_ms,
                "Mobile Load Time": f"{mobile_load_ms / 1000.0:.2f}s" if mobile_load_ms > 0 else "N/A",
                "PageSpeed Score": f"{pagespeed_score}/100" if mobile_load_ms > 0 else "N/A",
                "Pitch": pitch_hook,
                "Pitch_Hook": pitch_hook,
                "Pitch_Rank": pitch_rank,
                "pitch_rank": pitch_rank,
            })

        await page.close()
        await context.close()
        await browser.close()

    return final_leads

async def _audit_urls_cli(urls_input: str, limit: int = 15) -> list[dict]:
    """Audits arbitrary URL list with deep signal inspection."""
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
        browser = await p.chromium.launch(
            headless=True,
            args=get_optimized_browser_args()
        )

        for target_url in urls[:limit]:
            audit = await _audit_website_signal(browser, target_url)
            load_ms = audit.get("mobile_load_ms", 0)
            has_chat = audit.get("has_chatbot", False)
            pitch_rank, pitch = _get_pitch_hook(target_url, load_ms, has_chat)
            score = _calculate_pagespeed_score(load_ms / 1000.0) if load_ms > 0 else 0

            email_socials_parts = []
            if audit.get("email"):
                email_socials_parts.append(f"Email: {audit['email']}")
            if audit.get("socials"):
                email_socials_parts.append(f"Socials: {', '.join(audit['socials'][:2])}")
            email_socials_str = " | ".join(email_socials_parts) if email_socials_parts else "N/A"

            leads.append({
                "Business Name": audit.get("business_name") or _clean_business_name("", domain=target_url),
                "Contact": audit.get("phone", "Hidden") if audit.get("phone") != "Hidden" else (audit.get("email") or "N/A"),
                "Phone": audit.get("phone", "Hidden"),
                "Email": audit.get("email") or "N/A",
                "Socials": ", ".join(audit.get("socials", [])) if audit.get("socials") else "N/A",
                "Email/Socials": email_socials_str,
                "Website": target_url,
                "Region": "US",
                "Has_Chatbot_Widget": has_chat,
                "Mobile_Load_Ms": load_ms,
                "Mobile Load Time": f"{load_ms / 1000.0:.2f}s" if load_ms > 0 else "N/A",
                "PageSpeed Score": f"{score}/100" if load_ms > 0 else "N/A",
                "Pitch": pitch,
                "Pitch_Hook": pitch,
                "Pitch_Rank": pitch_rank,
                "pitch_rank": pitch_rank,
            })

        await browser.close()

    return leads

async def main():
    parser = argparse.ArgumentParser(description="Insight Scraper Worker - International B2B Lead & Signal Scraper")
    parser.add_argument("pos_query", nargs="?", default="", help="Positional query argument for backwards compatibility")
    parser.add_argument("--query", "-q", default="", help="Directory search query or URL(s)")
    parser.add_argument(
        "--region", 
        "-r", 
        default="US", 
        choices=["US", "GB", "AU", "CA", "AE", "KE", "us", "gb", "au", "ca", "ae", "ke"], 
        help="Target region: US, GB, AU, CA, AE, KE"
    )
    parser.add_argument(
        "--source", 
        "-s", 
        default="gmaps", 
        choices=["gmaps", "duckduckgo-places", "yellowpages-intl", "directory", "url_list", "urls", "audit"], 
        help="Source: gmaps, duckduckgo-places, yellowpages-intl, directory, or url_list"
    )
    parser.add_argument("--limit", "-l", type=int, default=25, help="Maximum number of leads (default: 25)")
    args = parser.parse_args()

    input_query = (args.query or args.pos_query or "").strip()
    if not input_query:
        print("[]")
        return

    source_type = args.source.lower()
    region = args.region.upper()
    limit = max(1, args.limit)

    if source_type in ["url_list", "urls", "audit"]:
        leads = await _audit_urls_cli(input_query, limit=limit)
    else:
        leads = await run_scraper(input_query, region=region, source=source_type, limit=limit)

    # Print raw JSON directly to stdout for caller subprocess
    print(json.dumps(leads))

if __name__ == '__main__':
    asyncio.run(main())
