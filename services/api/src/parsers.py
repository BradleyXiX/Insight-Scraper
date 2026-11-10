"""HTML parsers for multi-source business lead extraction.

Extracts structured candidate business leads from raw HTML without requiring a live browser.
"""

import re
import urllib.parse
from bs4 import BeautifulSoup


def _clean_business_name(raw_name: str, domain: str = "") -> str:
    """Cleans up raw title or site name into a concise business name."""
    if not raw_name or raw_name == "N/A":
        if domain:
            cleaned_domain = (
                re.sub(r"^(https?://)?(www\.)?", "", domain)
                .split("/")[0]
                .split(".")[0]
            )
            return cleaned_domain.capitalize()
        return "Unknown Business"

    parts = re.split(r"[\-\|\–\—\:]", raw_name)
    best_part = parts[0].strip()
    if len(best_part) < 3 and len(parts) > 1:
        best_part = parts[1].strip()
    return best_part[:70] if best_part else "Unknown Business"


def _extract_phone_from_soup(soup: BeautifulSoup, text: str) -> str:
    """Extracts phone number from tel: links or regex patterns."""
    tel_link = soup.select_one('a[href^="tel:"]')
    if tel_link and tel_link.get("href"):
        raw_phone = tel_link["href"].replace("tel:", "").strip()
        return urllib.parse.unquote(raw_phone)

    phone_pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}"
    match = re.search(phone_pattern, text)
    if match:
        found = match.group(0).strip()
        if len(re.sub(r"\D", "", found)) >= 7:
            return found
    return "Hidden"


def _extract_emails_and_socials(
    soup: BeautifulSoup, text: str
) -> tuple[str, list[str]]:
    """Extracts email addresses and social media profile URLs."""
    emails = set()

    for a in soup.select('a[href^="mailto:"]'):
        href = a["href"].replace("mailto:", "").split("?")[0].strip()
        if href and "@" in href:
            emails.add(href.lower())

    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"
    for match in re.findall(email_pattern, text):
        clean_email = match.lower()
        if (
            not re.search(
                r"\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2)$", clean_email
            )
            and "example.com" not in clean_email
            and "sentry.io" not in clean_email
        ):
            emails.add(clean_email)

    social_domains = [
        "facebook.com",
        "instagram.com",
        "linkedin.com",
        "twitter.com",
        "x.com",
        "youtube.com",
        "tiktok.com",
    ]
    socials = set()
    for a in soup.select("a[href]"):
        href = a["href"].strip()
        for domain in social_domains:
            if domain in href:
                if not any(
                    skip in href
                    for skip in [
                        "sharer",
                        "share",
                        "intent/tweet",
                        "shareArticle",
                        "policy",
                        "terms",
                    ]
                ):
                    socials.add(href)

    primary_email = sorted(list(emails))[0] if emails else ""
    return primary_email, sorted(list(socials))


def parse_gmaps(
    html: str, region: str = "US", limit: int | None = None
) -> list[dict]:
    """Parse Google Maps search results page HTML into lead candidate dicts."""
    if not html or not isinstance(html, str):
        return []
    leads = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select('div[role="feed"] > div > div[role="article"]')
        if not cards:
            cards = soup.select('div[role="article"]')

        for card in cards:
            if limit is not None and len(leads) >= limit:
                break

            name_el = card.select_one("div.fontHeadlineSmall") or card.select_one(
                'div[class*="qBF1Pd"]'
            )
            name = (
                name_el.text.strip()
                if name_el
                else (card.get("aria-label") or "Unknown Business")
            )
            if not name or name == "Unknown Business":
                continue

            website = ""
            website_el = (
                card.select_one('a[data-value="Website"]')
                or card.select_one('a[aria-label*="website" i]')
                or card.select_one('a[data-item-id="authority"]')
            )
            if website_el and website_el.get("href"):
                website = website_el["href"]

            card_text = card.get_text(separator=" ")
            phone = _extract_phone_from_soup(card, card_text)

            leads.append(
                {
                    "Business Name": name,
                    "Phone": phone,
                    "Website": website,
                    "Email": "",
                    "Socials": [],
                    "Has_Chatbot_Widget": False,
                    "Mobile_Load_Ms": 0,
                    "Pitch_Hook": "",
                    "Region": region,
                }
            )
    except Exception:
        return []
    return leads


def parse_duckduckgo(
    html: str, region: str = "US", limit: int | None = None
) -> list[dict]:
    """Parse DuckDuckGo Places search results page HTML into lead candidate dicts."""
    if not html or not isinstance(html, str):
        return []
    leads = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        place_items = soup.select(
            '.module--places .place-list__item, [data-testid="place-item"], .result--places'
        )
        for item in place_items[:limit] if limit is not None else place_items:
            name_el = item.select_one(
                '.place-list__item__title, [data-testid="place-title"], h2'
            )
            name = name_el.text.strip() if name_el else "Unknown Business"

            website = ""
            web_el = item.select_one('a[href^="http"]:not([href*="duckduckgo"])')
            if web_el and web_el.get("href"):
                website = web_el["href"]

            item_text = item.get_text(separator=" ")
            phone = _extract_phone_from_soup(item, item_text)

            leads.append(
                {
                    "Business Name": name,
                    "Phone": phone,
                    "Website": website,
                    "Email": "",
                    "Socials": [],
                    "Has_Chatbot_Widget": False,
                    "Mobile_Load_Ms": 0,
                    "Pitch_Hook": "",
                    "Region": region,
                }
            )

        if not leads:
            web_results = soup.select("article.result, .result__body")
            for res in web_results[:limit] if limit is not None else web_results:
                title_el = res.select_one("h2, .result__title")
                name = title_el.text.strip() if title_el else "Business"
                link_el = res.select_one('a[href^="http"]')
                website = link_el["href"] if link_el else ""
                if website and "duckduckgo.com" not in website:
                    leads.append(
                        {
                            "Business Name": _clean_business_name(
                                name, domain=website
                            ),
                            "Phone": "Hidden",
                            "Website": website,
                            "Email": "",
                            "Socials": [],
                            "Has_Chatbot_Widget": False,
                            "Mobile_Load_Ms": 0,
                            "Pitch_Hook": "",
                            "Region": region,
                        }
                    )
    except Exception:
        return []
    return leads


def parse_kenya(html: str, limit: int | None = None) -> list[dict]:
    """Parse yellowpageskenya.com search results page HTML into lead candidate dicts."""
    if not html or not isinstance(html, str):
        return []
    leads = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        cards = []
        for h2 in soup.find_all("h2"):
            card = h2.find_parent("div", class_="bg-white")
            if card and card not in cards and card.select_one('a[href^="tel:"]'):
                cards.append(card)

        for business in cards[:limit] if limit is not None else cards:
            name_el = business.select_one("h2")
            name = name_el.text.strip() if name_el else "Unknown Business"

            phone_el = business.select_one('a[href^="tel:"]')
            phone = (
                phone_el["href"].replace("tel:", "").strip()
                if (phone_el and phone_el.has_attr("href"))
                else "Hidden"
            )

            website = ""
            for a_tag in business.select("a[href]"):
                href = a_tag["href"]
                if href.startswith("http") and "yellowpageskenya" not in href:
                    website = href
                    break

            card_text = business.get_text(separator=" ")
            email, socials = _extract_emails_and_socials(business, card_text)

            leads.append(
                {
                    "Business Name": name,
                    "Phone": phone,
                    "Website": website,
                    "Email": email,
                    "Socials": socials,
                    "Has_Chatbot_Widget": False,
                    "Mobile_Load_Ms": 0,
                    "Pitch_Hook": "",
                    "Region": "KE",
                }
            )
    except Exception:
        return []
    return leads


def parse_yellowpages(
    html: str, region: str = "US", limit: int | None = None
) -> list[dict]:
    """Parse country-specific yellowpages directory search results page HTML."""
    if not html or not isinstance(html, str):
        return []
    region = region.upper()
    if region == "KE":
        return parse_kenya(html, limit=limit)

    leads = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        if region == "US":
            cards = soup.select(".result, .srp-listing")
            for card in cards[:limit] if limit is not None else cards:
                name_el = card.select_one("a.business-name")
                name = name_el.text.strip() if name_el else "Unknown"
                phone_el = card.select_one(
                    '.phones.phone.primary, [itemprop="telephone"]'
                )
                phone = phone_el.text.strip() if phone_el else "Hidden"
                web_el = card.select_one(
                    'a.track-visit-website, a[href^="http"]:not([href*="yellowpages.com"])'
                )
                website = web_el["href"] if web_el else ""
                leads.append(
                    {
                        "Business Name": name,
                        "Phone": phone,
                        "Website": website,
                        "Email": "",
                        "Socials": [],
                        "Has_Chatbot_Widget": False,
                        "Mobile_Load_Ms": 0,
                        "Pitch_Hook": "",
                        "Region": region,
                    }
                )
        elif region == "GB":
            cards = soup.select(
                '.businessCapsule, div[itemtype*="LocalBusiness"]'
            )
            for card in cards[:limit] if limit is not None else cards:
                name_el = card.select_one(".businessCapsule--title, h2")
                name = name_el.text.strip() if name_el else "Unknown"
                phone_el = card.select_one(
                    'a[href^="tel:"], .business--telephone'
                )
                phone = phone_el.text.strip() if phone_el else "Hidden"
                web_el = card.select_one(
                    'a[data-tracking*="website"], a[href^="http"]:not([href*="yell.com"])'
                )
                website = web_el["href"] if web_el else ""
                leads.append(
                    {
                        "Business Name": name,
                        "Phone": phone,
                        "Website": website,
                        "Email": "",
                        "Socials": [],
                        "Has_Chatbot_Widget": False,
                        "Mobile_Load_Ms": 0,
                        "Pitch_Hook": "",
                        "Region": region,
                    }
                )
        elif region in ["CA", "AU", "AE"]:
            leads = parse_duckduckgo(html, region=region, limit=limit)
    except Exception:
        return []
    return leads
