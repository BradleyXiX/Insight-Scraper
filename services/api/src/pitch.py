"""Deterministic email pitch generation for leads.

Generates concise, sendable B2B outreach emails based purely on measured facts
(mobile load time, HTTPS configuration, chatbot presence, website availability)
and optional workspace sender settings.

Rules:
- Strictly deterministic (no random values, no network, no LLMs, no timestamps).
- Purely measured facts — never infer or fabricate unverified details.
- Under 120 words. One observation, one question, no superlatives or fake familiarity.
- Signature assembled from sender_name, sender_email, sender_phone (omitted when empty).
- The final line is always the explicit opt-out.
"""

from typing import Any

OPT_OUT_LINE = "If this is not relevant, tell me and I will not follow up."

_PLACEHOLDER_NAMES = {"", "n/a", "na", "none", "unknown", "unknown business"}


def _get_val(obj: Any, *keys: str, default: Any = None) -> Any:
    for key in keys:
        if isinstance(obj, dict) and key in obj:
            val = obj[key]
            if val is not None:
                return val
        elif hasattr(obj, key):
            val = getattr(obj, key)
            if val is not None:
                return val
    return default


def _extract_domain(website: str) -> str:
    cleaned = (website or "").strip()
    if cleaned.lower().startswith("https://"):
        cleaned = cleaned[8:]
    elif cleaned.lower().startswith("http://"):
        cleaned = cleaned[7:]
    return cleaned.split("/")[0].strip()


def _format_signature(settings: Any) -> str:
    if not settings:
        return ""

    name = str(_get_val(settings, "sender_name") or "").strip()
    email = str(_get_val(settings, "sender_email") or "").strip()
    phone = str(_get_val(settings, "sender_phone") or "").strip()

    lines = []
    if name:
        lines.append(name)
    if email:
        lines.append(email)
    if phone:
        lines.append(phone)

    return "\n".join(lines)


def build_email(lead: Any, settings: Any = None) -> dict[str, str]:
    """Build a deterministic, sendable outreach email for a lead."""
    raw_rank = _get_val(lead, "pitch_rank", "Pitch_Rank")
    try:
        rank = int(raw_rank) if raw_rank is not None else 5
    except (ValueError, TypeError):
        rank = 5

    if rank not in (1, 2, 3, 4, 5):
        rank = 5

    business_name = str(_get_val(lead, "business_name", "Business Name", "name") or "").strip()
    # Rows saved before the parser always set a name carry "N/A"; a sendable email
    # must not open with "Hi N/A,".
    if business_name.lower() in _PLACEHOLDER_NAMES:
        business_name = ""
    website = str(_get_val(lead, "website", "Website") or "").strip()
    domain = _extract_domain(website)
    target_name = domain or business_name or "your site"

    mobile_load_ms = _get_val(lead, "mobile_load_ms", "mobile_load_time", default=0) or 0
    try:
        mobile_load_ms = int(mobile_load_ms)
    except (ValueError, TypeError):
        mobile_load_ms = 0

    greeting = f"Hi {business_name}," if business_name else "Hi,"

    if rank == 1 and mobile_load_ms <= 0:
        # Rank 1 means "measured slow site". With no measurement there is nothing to
        # cite, so fall through to the honest no-issue template instead of printing
        # an invented load time.
        rank = 5

    if rank == 1:
        sec = mobile_load_ms / 1000.0
        subject = f"Mobile load time for {target_name}"
        observation = (
            f"I tested {domain or 'your website'} on a mobile connection and it took {sec:.1f}s to load. "
            "Most mobile visitors leave if a page takes more than three seconds."
        )
        question = "Would faster mobile loading help you convert more visitors?"

    elif rank == 2:
        subject = f"HTTPS security notice for {target_name}"
        observation = (
            f"I noticed {domain or 'your website'} is loading over HTTP without an SSL certificate. "
            "Modern browsers flag non-HTTPS sites as 'Not Secure' before visitors read anything."
        )
        question = "Would you like help enabling HTTPS so browsers show the site as secure?"

    elif rank == 3:
        subject = f"After-hours inquiries for {target_name}"
        observation = (
            f"I checked {domain or 'your website'} and noticed there is no chat widget for incoming visitors. "
            "When prospective clients visit after hours, there is currently no way for them to get immediate answers."
        )
        question = "Would an automated assistant help you capture inquiries when your team is away?"

    elif rank == 4:
        subject = f"Online presence for {business_name or 'your business'}"
        observation = (
            f"I searched for {business_name or 'your business'} online and found a directory listing, "
            "but no dedicated website for your business."
        )
        question = "Are you looking to set up a dedicated website to capture local search leads?"

    else:  # rank == 5
        subject = f"Search visibility and content for {target_name}"
        observation = (
            f"I reviewed {domain or 'your website'} and the technical foundation is in good order. "
            "The next opportunity for inbound growth is usually organic search reach and local content."
        )
        question = "Are you currently working on search visibility to bring in more inbound inquiries?"

    body_blocks = [
        f"{greeting}\n\n{observation}\n\n{question}"
    ]

    sig = _format_signature(settings)
    if sig:
        body_blocks.append(sig)

    body_blocks.append(OPT_OUT_LINE)

    return {
        "subject": subject,
        "body": "\n\n".join(body_blocks),
    }
