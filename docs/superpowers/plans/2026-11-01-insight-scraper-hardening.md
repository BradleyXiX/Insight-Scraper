# Insight-Scraper Production Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five P0 production blockers (fail-open auth, RS256 dead in Docker, hardcoded port, wildcard CORS, SSRF) plus four P1 defects, without adding runtime dependencies or a schema migration.

**Architecture:** Each patch is independently deployable and independently verifiable. Auth moves from hand-rolled JWKS caching to `jwt.PyJWKClient` and fails closed at import. The API gains `Query` validation and env-driven CORS. The scraper is split into a browser launcher and a source pipeline so the stealth backend becomes swappable, then hardened with SSRF, robots.txt, dedupe, and bounded concurrency. The dashboard loses its dev token and gains a build-time API URL guard plus CSV injection protection.

**Tech Stack:** FastAPI 0.141.1, PyJWT 2.14.0 (`[crypto]`), SQLAlchemy 2.0.52, Playwright 1.49.0, Next.js 16.2.6, React 19.2.4, Tailwind 4, npm, Python `unittest`.

**Spec:** `docs/superpowers/specs/2026-11-01-insight-scraper-hardening-design.md`

## Global Constraints

- **No new runtime dependencies.** `cryptography` arrives via `PyJWT[crypto]`. `PyJWKClient`, `ipaddress`, `socket`, `urllib.robotparser`, `asyncio` are already available.
- **No new test framework.** Python uses stdlib `unittest`. `httpx` is NOT installed — use the stdlib ASGI shim in Task 2. Frontend verifies with `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Package manager is npm**, not pnpm (`package-lock.json` present).
- **Next.js is 16.2.6, not 15.** Read `apps/dashboard/node_modules/next/dist/docs/01-app/` before editing `page.tsx`.
- **Unset `APP_ENV` resolves to `production`.** Only `development`, `dev`, `test` are non-production.
- **`SCRAPE_TIMEOUT_SECONDS` defaults to 300.** `AUDIT_CONCURRENCY` defaults to 4. `DEV_TENANT_ID` defaults to `local_operator`.
- **Never read, log, or commit `.env` or `apps/dashboard/.env.local`.**
- **Work in a worktree**, never on `main`: `git worktree add ../worktrees/hardening-auth -b hardening/auth`.
- **Anchor edits on exact code strings**, not line numbers — the directive's line refs are stale.
- **One commit per task.** Never bundle.

## Review Focus

1. **A deploy with `APP_ENV` unset and `DEV_BYPASS_AUTH=true`** must not authenticate anyone. A copied `.env` is the most likely real-world trigger. *(Task 2)*
2. **A Clerk token signed by a different key, expired, or with the wrong issuer** must return 401, never 500 and never a tenant. *(Task 2)*
3. **A CSV cell beginning with `=`, `+`, `-`, or `@`** must render as literal text in Excel. Lead names come from scraped third-party pages. *(Task 5)*
4. **`source=url_list` pointed at a metadata or private IP** must be rejected before any fetch happens. *(Tasks 3, 7)*
5. **A prospect whose robots.txt disallows the bot** must keep its lead row, marked with a reason — never silently dropped. *(Task 7)*

---

### Task 1: Dependency and config baseline

Fixes P0-2. Without this, RS256 raises `NotImplementedError` in the Docker image and every login fails.

**Files:**
- Modify: `services/api/src/requirements.txt:9`
- Create: `.env.example`
- Modify: `README.md:83-96` (env block)

**Interfaces:**
- Consumes: nothing.
- Produces: `APP_ENV`, `PORT`, `HOST`, `CORS_ALLOWED_ORIGINS`, `CLERK_FRONTEND_API`, `CLERK_AUTHORIZED_PARTIES`, `DEV_BYPASS_AUTH`, `DEV_TENANT_ID`, `SCRAPE_TIMEOUT_SECONDS`, `AUDIT_CONCURRENCY`, `USE_CAMOUFOX`, `PAGESPEED_API_KEY` — consumed by Tasks 2, 3, 6, 7, 8.

- [ ] **Step 1: Reproduce the failure**

```powershell
docker build -t insight-api ./services/api
docker run --rm -e APP_ENV=production insight-api python -c "import jwt.algorithms as a; print('crypto:', a.has_crypto)"
```

Expected: `crypto: False`. This is the bug.

- [ ] **Step 2: Change the dependency**

In `services/api/src/requirements.txt`, replace the line `PyJWT` with:

```
PyJWT[crypto]==2.14.0
```

- [ ] **Step 3: Verify it passes**

```powershell
docker build -t insight-api ./services/api
docker run --rm -e APP_ENV=production insight-api python -c "import jwt.algorithms as a; assert a.has_crypto; print('RS256 OK in image')"
```

Expected: `RS256 OK in image`.

- [ ] **Step 4: Create `.env.example`**

Exact contents (no secrets, no real values):

```dotenv
# ---- API ----
APP_ENV=development            # production | development | test. UNSET MEANS PRODUCTION.
PORT=8000
HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Auth (Clerk). Required unless DEV_BYPASS_AUTH=true and APP_ENV is non-production.
CLERK_FRONTEND_API=
CLERK_AUTHORIZED_PARTIES=
DEV_BYPASS_AUTH=false          # local only; ignored when APP_ENV resolves to production
DEV_TENANT_ID=local_operator

# Data
DATABASE_URL=postgresql://user:password@localhost:15432/foundry

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Scraper
USE_CAMOUFOX=false             # local-only toggle; the Docker image stays Playwright-only
AUDIT_CONCURRENCY=4
SCRAPE_TIMEOUT_SECONDS=300
PAGESPEED_API_KEY=             # optional; reserved for Phase 2

# ---- Dashboard ----
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=
```

- [ ] **Step 5: Add `APP_ENV=development` to the README env block**

In `README.md`, inside the API `.env` fenced block (around lines 91-96), add `APP_ENV=development` as the first line, with the comment `# required locally; unset means production`.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/requirements.txt .env.example README.md
git commit -m "fix(api): install PyJWT[crypto] so RS256 works in the Docker image"
```

---

### Task 2: Fail-closed auth with PyJWKClient

Fixes P0-1, P1-1, and creates the test harness everything else uses.

**Files:**
- Rewrite: `services/api/src/auth.py`
- Create: `services/api/tests/_env.py`
- Create: `services/api/tests/asgi_client.py`
- Create: `services/api/tests/test_auth.py`

**Interfaces:**
- Consumes: `APP_ENV`, `CLERK_FRONTEND_API`, `CLERK_AUTHORIZED_PARTIES`, `DEV_BYPASS_AUTH`, `DEV_TENANT_ID` from Task 1.
- Produces:
  - `is_dev_bypass() -> bool`
  - `get_jwks_client() -> jwt.PyJWKClient`
  - `verify_clerk_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str`
  - `tests/_env.py` puts `services/api/src` on `sys.path` and sets test env — every later test module imports it first.
  - `tests/asgi_client.py::call(app, method, path, *, query=None, headers=None) -> tuple[int, list[tuple[bytes, bytes]], bytes]` — consumed by Task 3.

- [ ] **Step 1: Create the test bootstrap**

`services/api/tests/_env.py`:

```python
import os
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("CLERK_FRONTEND_API", "https://clerk.test.example")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.pop("DEV_BYPASS_AUTH", None)
```

- [ ] **Step 2: Create the stdlib ASGI shim**

`services/api/tests/asgi_client.py` — no `httpx`, drives the app directly. `call()` builds an HTTP scope, awaits the app with a `receive` that returns `{"type": "http.request", "body": b"", "more_body": False}`, and collects `http.response.start` + `http.response.body` messages. Return `(status, headers, body)`.

- [ ] **Step 3: Write the failing tests**

`services/api/tests/test_auth.py`. Assertions, in order:

1. `test_missing_clerk_config_refuses_to_start` — run `[sys.executable, "-c", "import auth"]` with `cwd=SRC`, `APP_ENV=production`, `CLERK_FRONTEND_API=""`, `DEV_BYPASS_AUTH` removed. Assert returncode != 0 and stderr contains `CLERK_FRONTEND_API`.
2. `test_production_ignores_bypass_flag` — `APP_ENV=production`, `DEV_BYPASS_AUTH=true` → `is_dev_bypass() is False`.
3. `test_unset_app_env_is_production` — `APP_ENV` removed, `DEV_BYPASS_AUTH=true` → `is_dev_bypass() is False`. *(Review Focus 1)*
4. `test_dev_bypass_honours_tenant` — `APP_ENV=test`, `DEV_BYPASS_AUTH=true`, `DEV_TENANT_ID=acme` → `verify_clerk_token(None) == "acme"`.
5. `test_missing_credentials_is_401` — bypass off, `credentials=None` → `HTTPException` status 401.
6. `test_wrong_signing_key_is_401` — token signed with key A, verifier patched to key B → 401. *(Review Focus 2)*
7. `test_expired_token_is_401` — `exp` in the past → 401.
8. `test_wrong_issuer_is_401` — `iss="https://evil.example"` → 401.
9. `test_valid_token_returns_org_id` — valid RS256 token with `org_id="org_123"` → returns `"org_123"`.
10. `test_token_without_org_id_is_403` — valid token, no `org_id` → 403.
11. `test_azp_mismatch_is_401` — `CLERK_AUTHORIZED_PARTIES=https://app.example`, token `azp="https://evil.example"` → 401.
12. `test_azp_absent_with_allowlist_is_401` — same allowlist, no `azp` claim → 401.
13. `test_jwks_client_is_memoised` — `get_jwks_client()` twice returns the same `jwt.PyJWKClient` instance.

Generate keys with:

```python
from cryptography.hazmat.primitives.asymmetric import rsa
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
```

Patch the network boundary, not the logic:

```python
class _FakeSigningKey:
    def __init__(self, key): self.key = key

class _FakeClient:
    def __init__(self, key): self._key = key
    def get_signing_key_from_jwt(self, token): return _FakeSigningKey(self._key)
```

then `auth.get_jwks_client = lambda: _FakeClient(public_key)` inside the test.

Tests 1 and 3 mutate process env, so they must run in a subprocess or restore env in `tearDown`. Prefer `unittest.mock.patch.dict(os.environ, ..., clear=False)` and `importlib.reload(auth)`.

- [ ] **Step 4: Run the tests and confirm they fail**

```powershell
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: FAIL — `auth.is_dev_bypass` still infers bypass from missing config.

- [ ] **Step 5: Rewrite `services/api/src/auth.py`**

Replace the whole file. Required behaviour, exactly:

- `APP_ENV = os.getenv("APP_ENV", "production").strip().lower()`; `IS_PRODUCTION = APP_ENV not in ("development", "dev", "test")`.
- `is_dev_bypass()` returns `False` when `IS_PRODUCTION`, else `os.getenv("DEV_BYPASS_AUTH", "").strip().lower() in ("true", "1", "yes")`.
- Module-level `RuntimeError("CLERK_FRONTEND_API is not configured. Refusing to start with authentication disabled. Set DEV_BYPASS_AUTH=true for local development only.")` when `not CLERK_FRONTEND_API and not is_dev_bypass()`.
- `get_jwks_client()` memoises `jwt.PyJWKClient(JWKS_URL, cache_keys=True, lifespan=300, timeout=10)`.
- `verify_clerk_token` decodes with `algorithms=["RS256"]`, `issuer=CLERK_ISSUER`, `leeway=10`, `options={"verify_aud": False, "require": ["exp", "iat", "sub"]}`.
- `azp` rule: allowlist empty → skip; `azp` in allowlist → allow; `azp` missing or not in allowlist → 401.
- `org_id` missing → 403.
- Catch order: `HTTPException` re-raise → `jwt.ExpiredSignatureError` → 401 → `jwt.InvalidTokenError` → log warning, 401 `"Invalid token"` → bare `Exception` → `logger.exception`, 401 `"Authentication failed"`. Never echo exception text to the client.

- [ ] **Step 6: Run the tests and confirm they pass**

```powershell
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: PASS, 13 tests.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/auth.py services/api/tests/
git commit -m "fix(api): fail closed on missing auth config and use PyJWKClient for RS256"
```

---

### Task 3: API validation, CORS, SSRF surface, timeout, port

Fixes P0-3, P0-4, P0-5, P1-2. Note: **keep the `db` dependency** — it feeds the Stripe 402 gate at `main.py:77`.

**Files:**
- Modify: `services/api/src/main.py:6` (imports), `:17-23` (CORS), `:25-59` (worker runner), `:61-69` (endpoint signature), `:104` (score label), `:192-194` (port)
- Create: `services/api/tests/test_main.py`

**Interfaces:**
- Consumes: `verify_clerk_token` (Task 2), `asgi_client.call` (Task 2), `CORS_ALLOWED_ORIGINS` / `SCRAPE_TIMEOUT_SECONDS` (Task 1).
- Produces: `SCRAPE_TIMEOUT_SECONDS: int` module constant; `app` importable with a production-valid env.

- [ ] **Step 1: Write the failing tests**

`services/api/tests/test_main.py`, importing `_env` first:

1. `test_limit_zero_rejected` → 422.
2. `test_limit_over_100_rejected` → 422.
3. `test_unknown_region_rejected` → 422.
4. `test_url_list_source_rejected` → 422. *(Review Focus 4 — API boundary)*
5. `test_allowed_origin_gets_cors_header` — `Origin: http://localhost:3000` → header present.
6. `test_foreign_origin_gets_no_cors_header` — `Origin: https://evil.example` → header absent.
7. `test_missing_cors_config_in_production_refuses_to_start` — subprocess with `APP_ENV=production`, `CORS_ALLOWED_ORIGINS=""` → returncode != 0.
8. `test_worker_timeout_returns_empty_list` — patch `subprocess.check_output` to raise `subprocess.TimeoutExpired` → `_run_scraper_subprocess(...) == []`.

- [ ] **Step 2: Run and confirm they fail**

```powershell
.\venv\Scripts\python.exe -m unittest services\api\tests\test_main.py -v
```

Expected: FAIL — no validation, wildcard CORS.

- [ ] **Step 3: Apply the `main.py` edits**

CORS block — replace the wildcard middleware with:

```python
_cors_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
if not _cors_origins:
    if os.getenv("APP_ENV", "production").strip().lower() not in ("development", "dev", "test"):
        raise RuntimeError("CORS_ALLOWED_ORIGINS must be set in production.")
    _cors_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
```

Worker runner — add `SCRAPE_TIMEOUT_SECONDS = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "300"))` above the function, change the call to `subprocess.check_output(cmd, text=True, timeout=SCRAPE_TIMEOUT_SECONDS)`, and add `except subprocess.TimeoutExpired:` returning `[]` with a stderr note.

Endpoint signature — replace with `Query` validation. Import `Query` on line 6. `source` pattern is `^(gmaps|duckduckgo-places|yellowpages-intl)$` (no `url_list`). `region` pattern is `^(US|GB|AU|CA|AE|KE|us|gb|au|ca|ae|ke)$`. `limit` is `Query(25, ge=1, le=100)`. `query` is `Query(..., min_length=2, max_length=200)`. **Leave `db: Session = Depends(get_db)` in place.**

Score label — in the `extras.append(...)` call at `:104`, change the literal `"Speed: "` to `"Perf est.: "`.

Port — `uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8000")))`.

- [ ] **Step 4: Run and confirm they pass**

```powershell
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: PASS, 21 tests total.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/main.py services/api/tests/test_main.py
git commit -m "fix(api): validate scrape inputs, allowlist CORS, add worker timeout and \$PORT"
```

---

### Task 4: Deploy configuration

Fixes the remaining half of P0-3 and P1-5.

**Files:**
- Modify: `services/api/Dockerfile:20`
- Modify: `apps/dashboard/Dockerfile` (add `ARG`/`ENV` before build)
- Modify: `docker-compose.yml:39-45`

**Interfaces:**
- Consumes: `PORT` (Task 1), `NEXT_PUBLIC_API_URL` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the API Dockerfile**

Replace `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]` with:

```dockerfile
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

- [ ] **Step 2: Update the dashboard Dockerfile**

Before the `npm run build` step, add:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```

- [ ] **Step 3: Update compose**

Remove `NEXT_PUBLIC_API_URL=http://api:8000` from the dashboard's runtime `environment:` list. Under the dashboard's `build:`, add:

```yaml
    build:
      context: ./apps/dashboard
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
```

- [ ] **Step 4: Verify**

```powershell
docker compose config --quiet
docker build -t insight-api ./services/api
docker run --rm -e APP_ENV=production -e CLERK_FRONTEND_API=https://clerk.test.example -e CORS_ALLOWED_ORIGINS=https://app.test.example insight-api python -c "import main; print('boots')"
```

Expected: `boots`. Then confirm a missing `CLERK_FRONTEND_API` refuses to boot:

```powershell
docker run --rm -e APP_ENV=production insight-api python -c "import main"
```

Expected: non-zero exit, `CLERK_FRONTEND_API is not configured`.

- [ ] **Step 5: Commit**

```bash
git add services/api/Dockerfile apps/dashboard/Dockerfile docker-compose.yml
git commit -m "fix(deploy): honour \$PORT and pass NEXT_PUBLIC_API_URL as a build arg"
```

---

### Task 5: Dashboard API URL, dev token, CSV safety

Fixes P1-3, P1-4, and the frontend half of P0-3's env contract.

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/page.tsx` (module scope; `:65`; `:81`; `:108-113`; `:165-192`; `:209-214`)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_API_URL` (Task 1).
- Produces: module-scope `API_BASE_URL: string`, `csvCell(value: unknown): string`.

- [ ] **Step 1: Read the Next.js 16 guide**

Read `apps/dashboard/node_modules/next/dist/docs/01-app/` for env-var inlining and client-component rules before editing. `apps/dashboard/AGENTS.md` requires it.

- [ ] **Step 2: Add the build-time API URL**

Module scope, below `SOURCE_OPTIONS`:

```tsx
// NEXT_PUBLIC_* is inlined at build time. A missing value must fail loudly in
// production rather than silently pointing the browser at localhost.
const API_BASE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:8000";
  return "";
})();
```

Replace `const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";` with `const apiUrl = API_BASE_URL;`.

Add at the top of both fetch sites:

```tsx
        if (!apiUrl) {
          console.error("NEXT_PUBLIC_API_URL is not configured for this build.");
          return;
        }
```

- [ ] **Step 3: Remove the dev bypass token (two identical blocks)**

Replace both occurrences of:

```tsx
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          headers["Authorization"] = "Bearer dev_bypass_token";
        }
```

with:

```tsx
        if (!token) return; // /dashboard is Clerk-protected; no session, no request.
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
```

- [ ] **Step 4: Add the CSV injection guard**

Above `handleExportCSV`:

```tsx
// OWASP CSV injection: Excel and Sheets execute cells beginning with = + - @.
const csvCell = (value: unknown): string => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
```

In `handleExportCSV`, change `.map((field) => ...)` to `.map(csvCell)`, change the header row to `headers.map(csvCell).join(",")`, prefix the content with `"\uFEFF"`, and replace the synchronous `URL.revokeObjectURL(url)` with `setTimeout(() => URL.revokeObjectURL(url), 0)`.

- [ ] **Step 5: Align the pitch fallback**

Change `return "Qualified Enterprise AI Lead";` to `return "Pitch Enterprise AI Automation"; // must match scraper_worker._get_pitch_hook`.

- [ ] **Step 6: Verify compile and lint**

```powershell
cd apps\dashboard
npx tsc --noEmit
npm run lint
```

Expected: both exit 0.

- [ ] **Step 7: Manual acceptance (Review Focus 3)**

Run `npm run dev`, scrape or seed a lead whose business name is `=1+1`, export CSV, open in Excel. Expected: the cell shows `'=1+1` as text, not `2`.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/app/dashboard/page.tsx
git commit -m "fix(dashboard): guard CSV export against formula injection and remove dev token"
```

---

### Task 6: Split the scraper into launcher and pipeline

Removes the dead `camoufox_available` code and `--disable-web-security`. **Pure move — the diff must show zero changed statements inside the moved block.**

**Files:**
- Modify: `services/api/src/scraper_worker.py` (imports; `:596-722`; `:737-774`)
- Create: `services/api/tests/test_scraper_worker.py`

**Interfaces:**
- Consumes: `USE_CAMOUFOX` (Task 1).
- Produces:
  - `_launch_browser()` — async context manager yielding a Playwright `Browser`.
  - `_run_source_pipeline(browser, query: str, region: str, source: str, limit: int) -> list[dict]`
  - `run_scraper(query: str, region: str = "US", source: str = "gmaps", limit: int = 25) -> list[dict]`
  - `_get_pitch_hook(mobile_load_ms: int, has_chatbot: bool) -> str` (unchanged, now covered by tests)

- [ ] **Step 1: Write the failing tests**

`services/api/tests/test_scraper_worker.py`:

1. `test_pitch_hook_slow_site` — `_get_pitch_hook(3500, True) == "Pitch $750 Speed Overhaul (#2)"`.
2. `test_pitch_hook_no_chatbot` — `_get_pitch_hook(1200, False) == "Pitch $1,000 RAG Bot (#4)"`.
3. `test_pitch_hook_qualified` — `_get_pitch_hook(1200, True) == "Pitch Enterprise AI Automation"`.
4. `test_launch_browser_falls_back_without_camoufox` — `USE_CAMOUFOX=true` and `camoufox` unimportable → still yields a browser (patch `async_playwright`).

- [ ] **Step 2: Run and confirm they fail**

```powershell
.\venv\Scripts\python.exe -m unittest services\api\tests\test_scraper_worker.py -v
```

Expected: FAIL — `_launch_browser` does not exist.

- [ ] **Step 3: Add `_launch_browser`**

Add `from contextlib import asynccontextmanager` to the imports, then implement `_launch_browser` per spec §16.10: prefer `from camoufox.async_api import AsyncCamoufox` when `USE_CAMOUFOX` is truthy, else `async_playwright().chromium.launch(headless=True, args=[...])` with exactly these args — `--disable-blink-features=AutomationControlled`, `--disable-infobars`, `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`. **Do not include `--disable-web-security`.** On a missing camoufox import, print a stderr warning and fall through. Close the browser in a `finally`.

- [ ] **Step 4: Move the pipeline body**

Cut the body of `run_scraper` from the `async with async_playwright() as p:` line's interior through the `final_leads.append(...)` loop into `_run_source_pipeline`. Dedent by 4. Wrap page and context lifetime in `try/finally`. Delete the trailing `page.close()`, `context.close()`, and `browser.close()` calls — the launcher and the `finally` own them. Then `run_scraper` becomes region normalisation plus:

```python
    async with _launch_browser() as browser:
        return await _run_source_pipeline(browser, query, region, source.lower(), limit)
```

Apply `_launch_browser()` to `_audit_urls_cli` as well.

- [ ] **Step 5: Verify no logic changed**

```powershell
git diff --stat
git diff -U0 services/api/src/scraper_worker.py | Select-String -Pattern '^[-+][^-+]' | Measure-Object
```

Review that every removed line reappears unchanged (dedented) in the added lines.

- [ ] **Step 6: Run and confirm they pass**

```powershell
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: PASS, 25 tests total.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/scraper_worker.py services/api/tests/test_scraper_worker.py
git commit -m "refactor(scraper): split browser launch from source pipeline and wire camoufox"
```

---

### Task 7: SSRF guard, robots.txt, dedupe

Fixes P0-5 in the worker, adds the robots.txt guardrail, and prevents intra-run duplicate rows.

**Files:**
- Modify: `services/api/src/scraper_worker.py` (imports; new helpers; `_audit_website_signal`; `_audit_urls_cli`; candidate loop)
- Modify: `services/api/tests/test_scraper_worker.py`

**Interfaces:**
- Consumes: `_run_source_pipeline` (Task 6).
- Produces:
  - `_is_safe_public_url(url: str) -> bool`
  - `_robots_allows(url: str) -> bool` (async)
  - `_lead_dedupe_key(name: str, website: str) -> str`
  - New lead field `Audit_Skipped: str | None`

- [ ] **Step 1: Write the failing tests**

Add to `test_scraper_worker.py`:

5. `test_rejects_loopback` — `_is_safe_public_url("http://127.0.0.1")` is `False`.
6. `test_rejects_metadata_ip` — `_is_safe_public_url("http://169.254.169.254/latest/meta-data/")` is `False`. *(Review Focus 4)*
7. `test_rejects_private_range` — `_is_safe_public_url("http://10.0.0.5")` is `False`.
8. `test_rejects_non_http_scheme` — `_is_safe_public_url("file:///etc/passwd")` is `False`.
9. `test_allows_public_url` — `_is_safe_public_url("https://example.com")` is `True`.
10. `test_dedupe_collapses_www_and_case` — `_lead_dedupe_key("Acme", "https://WWW.Acme.com/x") == _lead_dedupe_key("acme", "https://acme.com/y")`.
11. `test_robots_disallow_marks_lead` — patch `_robots_allows` to return `False`, call `_audit_website_signal`, assert the returned dict has `Audit_Skipped == "robots.txt"` and `mobile_load_ms == 0`. *(Review Focus 5)*

- [ ] **Step 2: Run and confirm they fail**

Expected: FAIL — helpers do not exist.

- [ ] **Step 3: Implement the guards**

- `_is_safe_public_url` — parse the URL, require scheme in `("http", "https")` and a hostname, resolve with `socket.getaddrinfo`, and reject if any resolved address is `is_private`, `is_loopback`, `is_link_local`, `is_reserved`, `is_multicast`, or `is_unspecified`. Return `False` on `socket.gaierror` or `ValueError`.
- Call it as the first statement of `_audit_website_signal` (raise `ValueError` on failure) and filter the URL list in `_audit_urls_cli`.
- `_robots_allows` — module-level `_ROBOTS_CACHE: dict[str, urllib.robotparser.RobotFileParser | None]`, `_ROBOTS_UA = "InsightScraperBot/1.0 (+https://insight-scraper.app/bot)"`, fetch with `await asyncio.to_thread(rp.read)`. A robots fetch failure fails **open** and caches `None`.
- In `_audit_website_signal`, if `_robots_allows` is false, return `{"business_name": _clean_business_name("", domain=target_url), "phone": "Hidden", "email": "", "socials": [], "mobile_load_ms": 0, "has_chatbot": False, "Audit_Skipped": "robots.txt"}` and make no request. Do **not** gate the directory scrapers.
- `_lead_dedupe_key` — return the lowercased `netloc` with a leading `www.` stripped when a website exists, else the collapsed-whitespace lowercased name. Dedupe `raw_candidates` before enrichment, keeping first occurrence.
- Thread `Audit_Skipped` through to the final lead dict, defaulting to `None`.

- [ ] **Step 4: Run and confirm they pass**

```powershell
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: PASS, 32 tests total.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/scraper_worker.py services/api/tests/test_scraper_worker.py
git commit -m "fix(scraper): block private-network fetches, honour robots.txt, dedupe candidates"
```

---

### Task 8: Bounded concurrency and honest scoring label

Fixes P1-2 at its source and P2 score labelling.

**Files:**
- Modify: `services/api/src/scraper_worker.py` (candidate loop; `_calculate_pagespeed_score` rename)

**Interfaces:**
- Consumes: `_run_source_pipeline` (Task 6), `AUDIT_CONCURRENCY` (Task 1).
- Produces: `_enrich_candidate(browser, cand: dict, region: str, sem: asyncio.Semaphore) -> dict | None`; `_estimate_perf_score(load_time_seconds: float) -> int`.

- [ ] **Step 1: Extract the enrichment step**

Move the per-lead body of the candidate loop into `_enrich_candidate`, unchanged, wrapped in `async with sem:`. Return `None` and log to stderr when that single lead raises — never fail the batch.

- [ ] **Step 2: Replace the loop**

```python
        sem = asyncio.Semaphore(int(os.getenv("AUDIT_CONCURRENCY", "4")))
        enriched = await asyncio.gather(
            *(_enrich_candidate(browser, c, region, sem) for c in raw_candidates[:limit])
        )
        final_leads = [lead for lead in enriched if lead]
```

- [ ] **Step 3: Rename the scorer**

Rename `_calculate_pagespeed_score` to `_estimate_perf_score` at both definition and both call sites. Change the docstring to: `"""Heuristic estimate from Navigation Timing. Not Google Lighthouse."""`

- [ ] **Step 4: Verify timing improvement**

Run a scrape against 8 known-reachable sites with `AUDIT_CONCURRENCY=4`, then with `1`. Expected: the concurrent run finishes in roughly half the wall time, with identical lead counts.

- [ ] **Step 5: Run the full suite**

```powershell
.\venv\Scripts\python.exe -m compileall -q services\api\src
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

Expected: PASS, 32 tests.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/scraper_worker.py
git commit -m "perf(scraper): audit leads concurrently and label the score as an estimate"
```

---

## Final Verification

- [ ] `docker run --rm -e APP_ENV=production insight-api python -c "import main"` exits non-zero naming `CLERK_FRONTEND_API`.
- [ ] `docker run --rm -e APP_ENV=production -e CLERK_FRONTEND_API=https://clerk.test.example -e CORS_ALLOWED_ORIGINS=https://app.test.example insight-api python -c "import jwt.algorithms as a; assert a.has_crypto"` passes.
- [ ] `.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v` → 32 passing.
- [ ] `cd apps\dashboard; npx tsc --noEmit; npm run lint` → clean.
- [ ] A CSV containing `=1+1` opens in Excel as text.
- [ ] `grep -r "dev_bypass_token" apps/dashboard/src` returns nothing.
- [ ] `grep -r "disable-web-security" services/api/src` returns nothing.
- [ ] `grep -r "url_list" services/api/src/main.py` returns nothing.

## Deferred to Phase 2 (do not build here)

Meta Ad Library source, real PageSpeed Insights scoring, cross-run dedupe via `dedupe_hash` + unique index, `Score_Source` persistence.
