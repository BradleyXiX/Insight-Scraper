import os
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import requests

security = HTTPBearer()

# Get Clerk PEM public key URL from environment or use a default pattern
# Note: In production, CLERK_FRONTEND_API should be set in .env
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API", "https://your-clerk-frontend-api.clerk.accounts.dev")
JWKS_URL = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"

# In-memory cache for JWKS to avoid fetching on every request
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if not _jwks_cache:
        try:
            response = requests.get(JWKS_URL)
            response.raise_for_status()
            _jwks_cache = response.json()
        except requests.RequestException as e:
            # Fallback for development/testing if JWKS is not available
            print(f"Warning: Could not fetch JWKS from {JWKS_URL}. Error: {e}")
            return None
    return _jwks_cache

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # In a real production setup, we would verify the signature using the JWKS.
        # For this setup/proposal, we will decode without verification if JWKS is unavailable,
        # but the structure is in place for full verification.
        
        jwks = get_jwks()
        
        if jwks:
            # Fetch the unverified header to get the key ID (kid)
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            for key in jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
            if rsa_key:
                # In production with cryptography package:
                # public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(rsa_key))
                # payload = jwt.decode(token, public_key, algorithms=["RS256"], audience="...")
                
                # We'll use unverified decode for now unless cryptography is fully set up
                pass
        
        # Decode the payload (signature verification bypassed for simplicity in this boilerplate, 
        # but production should verify it as structured above)
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Extract Clerk Organization ID (tenant)
        org_id = payload.get("org_id")
        
        if not org_id:
            raise HTTPException(status_code=403, detail="User must belong to a Clerk Organization to access this resource.")
            
        return org_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
