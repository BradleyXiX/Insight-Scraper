# Phase 0 — Truth and Safety

**Date:** 2026-11-06
**Status:** approved, complete
**Parent:** `docs/product/2026-11-06-completion-assessment.md`

## Goal

Remove every way this deployment can hurt its owner or mislead a visitor before any
feature work starts. Phase 0 does not add product capability; it makes the existing
capability honest and safe.

## Done when

1. A request with no token to a production-configured API returns `401`.
2. A request from an origin outside `ALLOWED_ORIGINS` gets no CORS permission.
3. `limit=10000`, a 1-character query, and an unknown region/source return `422`.
4. A production process refuses to start with `DEV_BYPASS_AUTH=true`.
5. No page advertises a feature with no code path.
6. `pytest` covers auth, CORS, validation and configuration.

## Tasks

### 1. Add `services/api/src/config.py`

Single source of truth for environment interpretation. All checks read at call time so
tests can monkeypatch the environment.

- `environment()` → `ENVIRONMENT`, default `development`.
- `is_production()`.
- `dev_bypass_enabled()` → true only when explicitly requested **and** not production.
- `dev_tenant_id()`.
- `clerk_frontend_api()` → `None` for unset or placeholder values.
- `allowed_origins()` → comma-separated `ALLOWED_ORIGINS`; localhost defaults in
  development; empty list in production.
- `billing_configured()` → both Stripe secret and webhook secret present.
- `validate_startup()` → raises `RuntimeError` on production + bypass.

### 2. Make auth fail closed (`services/api/src/auth.py`)

- Delete the "missing Clerk config means bypass" fallback.
- Missing Clerk config outside bypass → `503 authentication_not_configured`.
- Bypass only from explicit `DEV_BYPASS_AUTH`, never in production.
- Resolve JWKS URL at request time; add a cache TTL.
- Require `exp` and `sub` in the decoded token.

### 3. Harden the API (`services/api/src/main.py`)

- CORS from `config.allowed_origins()`, no wildcard.
- Validate `query` (2–200 chars), `region` (6 values), `source` (3 values), `limit` (1–50).
- Distinguish worker failure (`502`) from zero results (`200`, `status: "empty"`).
- Add a worker timeout (`504`).
- Refuse scraping with `503` when billing is required but unconfigured.
- Remove `POST /api/checkout` (the UI uses the Next.js route; this one accepted a
  client-supplied price id).
- Add `/health/ready` with a database probe; keep `/health` as liveness.

### 4. Remove secret defaults (`services/api/src/stripe_service.py`)

- No `sk_test_123` / `whsec_123` fallbacks.
- Webhook returns `503` when the signing secret is absent.
- Delete `create_checkout_session` with the removed endpoint.

### 5. Deployment configuration

- `render.yaml`: remove `DEV_BYPASS_AUTH` / `DEV_TENANT_ID`, add
  `ENVIRONMENT=production` and the Vercel origin in `ALLOWED_ORIGINS`.
- `docker-compose.yml`: explicit `ENVIRONMENT=development` and localhost origin.
- Add `services/api/.env.example`.

### 6. Remove false claims

- `apps/dashboard/src/app/pricing/page.tsx` and
  `apps/dashboard/src/app/dashboard/billing/page.tsx`: rewrite both feature lists.
  Remove unlimited searches, 10x concurrency, JSON export, automated enrichment,
  99.9% SLA, priority 24/7 support, dedicated infrastructure, rate-limit bypass.
- `apps/dashboard/src/app/page.tsx`: rewrite the Pro FAQ answer.
- `apps/dashboard/src/app/dashboard/page.tsx`: "audits mobile PageSpeed signals" →
  "measures mobile load time"; the score is a load-time approximation, not Lighthouse.
- Billing footer: no "cancel anytime" until a portal exists; no "account activated
  immediately" until the webhook path is registered.

### 7. Delete dead code and correct docs

- Delete `services/api/src/dashboard.py` (Streamlit, imports a removed function,
  not in requirements).
- `README.md`: Next.js 16, remove glassmorphic/async-army/ironclad claims, add the
  backend env reference and the local bypass explanation.

### 8. Tests

`services/api/tests/` with `conftest.py` and:

- `test_auth.py` — no token 401; bypass disabled in production; missing Clerk config
  503; dev bypass returns the configured tenant.
- `test_validation.py` — query, region, source, limit boundaries.
- `test_cors.py` — allowed origin echoed, unlisted origin not echoed.
- `test_config.py` — origin parsing, startup guard, billing guard.
- `test_worker_errors.py` — failed subprocess maps to 502, empty result maps to
  `status: "empty"`.

`services/api/requirements-dev.txt` adds `pytest` and `httpx`.

## Verification

```powershell
.venv\Scripts\python -m pytest services/api/tests -q
cd apps/dashboard
npm run lint:design
npm test
npx tsc --noEmit
npm run build
```

## Out of scope

Job lifecycle, history, settings, JSON export, dedupe, local operator mode — all
Phase 1. Payments, portal and webhook registration — Phase 3.
