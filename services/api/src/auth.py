import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import requests

import config

security = HTTPBearer(auto_error=False)

# Clerk rotates signing keys. Cache the JWKS for an hour instead of per process.
_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict | None = None
_jwks_cached_at = 0.0


def is_dev_bypass() -> bool:
    """Whether the explicit local auth bypass applies (never in production)."""
    return config.dev_bypass_enabled()


def get_jwks() -> dict | None:
    """Fetch and cache Clerk's JWKS document. Returns None when it cannot be read."""
    global _jwks_cache, _jwks_cached_at

    if _jwks_cache is not None and (time.monotonic() - _jwks_cached_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    frontend_api = config.clerk_frontend_api()
    if not frontend_api:
        return None

    jwks_url = f"{frontend_api}/.well-known/jwks.json"
    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cached_at = time.monotonic()
    except (requests.RequestException, ValueError) as exc:
        print(f"Warning: could not fetch JWKS from {jwks_url}: {exc}")
        return None

    return _jwks_cache


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Resolve the caller's tenant id from a Clerk session token.

    Returns:
        The Clerk organization id, or the configured local tenant while the explicit
        development bypass is active.

    Raises:
        401 when a token is missing or invalid.
        403 when the token has no organization.
        503 when authentication is not configured or the key set is unreachable.
    """
    if config.dev_bypass_enabled():
        return config.dev_tenant_id()

    frontend_api = config.clerk_frontend_api()
    if not frontend_api:
        raise HTTPException(
            status_code=503,
            detail=(
                "Authentication is not configured. Set CLERK_FRONTEND_API, or set "
                "DEV_BYPASS_AUTH=true for local development only."
            ),
        )

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = credentials.credentials
    try:
        jwks = get_jwks()
        if not jwks or "keys" not in jwks:
            raise HTTPException(
                status_code=503,
                detail="Could not retrieve the authentication key set. Try again shortly.",
            )

        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Token header is missing a key id")

        rsa_key = None
        for key in jwks["keys"]:
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key.get("use", "sig"),
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail="No matching signing key for this token")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False, "require": ["exp", "sub"]},
        )

        org_id = payload.get("org_id")
        if not org_id:
            raise HTTPException(
                status_code=403,
                detail="A Clerk organization is required to access this workspace.",
            )

        return org_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - never leak a bare 500 from auth
        raise HTTPException(status_code=401, detail=f"Authentication error: {exc}")
