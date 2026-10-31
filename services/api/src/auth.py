import os
import json
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import requests

security = HTTPBearer(auto_error=False)

# Get Clerk PEM public key URL from environment or use a default pattern
# Note: In production, CLERK_FRONTEND_API should be set in .env
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API", "https://your-clerk-frontend-api.clerk.accounts.dev")
JWKS_URL = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"

# In-memory cache for JWKS to avoid fetching on every request
_jwks_cache = None

def is_dev_bypass() -> bool:
    """
    Determines whether local dev auth bypass is active.
    Defaults to True when DEV_BYPASS_AUTH=true, or when CLERK_FRONTEND_API is not configured/placeholder.
    """
    env_bypass = os.getenv("DEV_BYPASS_AUTH")
    if env_bypass is not None:
        return env_bypass.strip().lower() in ("true", "1", "yes")

    # If DEV_BYPASS_AUTH is not explicitly provided, check if CLERK_FRONTEND_API is missing or placeholder
    clerk_api = os.getenv("CLERK_FRONTEND_API", "").strip()
    if not clerk_api or "your-clerk" in clerk_api or "placeholder" in clerk_api:
        return True
    return False

def get_jwks():
    global _jwks_cache
    if not _jwks_cache:
        try:
            response = requests.get(JWKS_URL, timeout=10)
            response.raise_for_status()
            _jwks_cache = response.json()
        except requests.RequestException as e:
            # Fallback for development/testing if JWKS is not available
            print(f"Warning: Could not fetch JWKS from {JWKS_URL}. Error: {e}")
            return None
    return _jwks_cache

def verify_clerk_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    """
    Verifies Clerk RS256 JWT using JWKS keys.
    Provides DEV_BYPASS_AUTH=true flag to allow local solo scraping runs without external auth roundtrips.
    Defaults to true when CLERK_FRONTEND_API is not configured.
    Returns tenant_id="local_operator" in dev bypass mode.
    """
    # 1. Clean DEV_BYPASS_AUTH check for solo local scraping runs
    if is_dev_bypass():
        return os.getenv("DEV_TENANT_ID", "local_operator")

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = credentials.credentials
    try:
        jwks = get_jwks()
        if not jwks or "keys" not in jwks:
            raise HTTPException(status_code=500, detail="Could not retrieve JWKS for token verification")

        # Fetch the unverified header to get the key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Token header missing key ID (kid)")

        rsa_key = None
        for key in jwks["keys"]:
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key.get("use", "sig"),
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail=f"No matching JWK key found for kid: {kid}")

        # Full RS256 JWKS signature verification via RSAAlgorithm.from_jwk()
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)
        
        decode_options = {"verify_aud": False}
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=decode_options
        )

        # Extract Clerk Organization ID (tenant)
        org_id = payload.get("org_id")
        if not org_id:
            raise HTTPException(
                status_code=403, 
                detail="User must belong to a Clerk Organization to access this resource."
            )

        return org_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
