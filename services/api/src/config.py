"""Environment configuration for the Insight Scraper API.

Every value is read at call time rather than at import time so tests can change the
environment without reloading modules. Defaults are chosen to fail closed: a process
that is unclear about its environment gets development semantics, and production
never enables the auth bypass.
"""

import os

from dotenv import load_dotenv

# Local convenience: a repo-level `.env` is loaded for `uvicorn` runs. Existing
# process variables always win, and a container without a `.env` is unaffected.
load_dotenv()

TRUTHY = {"1", "true", "yes", "on"}

REGIONS = ("US", "GB", "AU", "CA", "AE", "KE")
SOURCES = ("gmaps", "duckduckgo-places", "yellowpages-intl")

SOURCE_INFO: dict[str, dict] = {
    "gmaps": {
        "label": "Google Maps",
        "degraded": False,
        "note": "",
    },
    "duckduckgo-places": {
        "label": "DuckDuckGo Places",
        "degraded": True,
        "note": "DuckDuckGo places endpoint currently triggers anti-bot error responses; zero results returned.",
    },
    "yellowpages-intl": {
        "label": "YellowPages Intl",
        "degraded": False,
        "note": "",
    },
}

MAX_LEAD_LIMIT = 50
MAX_QUERY_LENGTH = 200
MIN_QUERY_LENGTH = 2

_PLACEHOLDER_MARKERS = ("your-clerk", "placeholder", "example.com")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def environment() -> str:
    """Deployment environment name. Anything other than 'production' is development."""
    return _env("ENVIRONMENT", "development").lower()


def is_production() -> bool:
    return environment() == "production"


def _is_truthy(value: str) -> bool:
    return value.strip().lower() in TRUTHY


def dev_bypass_requested() -> bool:
    """True when DEV_BYPASS_AUTH is set to a truthy value, regardless of environment."""
    return _is_truthy(_env("DEV_BYPASS_AUTH"))


def dev_bypass_enabled() -> bool:
    """The auth bypass only ever applies outside production."""
    return dev_bypass_requested() and not is_production()


def dev_tenant_id() -> str:
    return _env("DEV_TENANT_ID", "local_operator") or "local_operator"


def clerk_frontend_api() -> str | None:
    """Return the configured Clerk frontend API, or None for unset/placeholder values."""
    value = _env("CLERK_FRONTEND_API").rstrip("/")
    if not value:
        return None
    lowered = value.lower()
    if any(marker in lowered for marker in _PLACEHOLDER_MARKERS):
        return None
    return value


def allowed_origins() -> list[str]:
    """CORS allowlist.

    Production deliberately defaults to an empty list: an unconfigured deployment
    should reject cross-origin browser calls rather than expose itself to every site.
    Development defaults to the local dashboard so `npm run dev` works with no setup.
    """
    raw = _env("ALLOWED_ORIGINS")
    if raw:
        origins = [item.strip().rstrip("/") for item in raw.split(",")]
        return [origin for origin in origins if origin]

    if is_production():
        return []

    return ["http://localhost:3000", "http://127.0.0.1:3000"]


def billing_configured() -> bool:
    """Billing can only gate access when Stripe has both a key and a webhook secret."""
    return bool(_env("STRIPE_SECRET_KEY")) and bool(_env("STRIPE_WEBHOOK_SECRET"))


def validate_startup() -> None:
    """Refuse to boot a production process that would disable authentication.

    Silently ignoring the flag would hide a serious misconfiguration. Crashing makes
    the deployment fail visibly instead of running without auth.
    """
    if is_production() and dev_bypass_requested():
        raise RuntimeError(
            "DEV_BYPASS_AUTH must not be enabled when ENVIRONMENT=production. "
            "Remove the variable and redeploy."
        )
