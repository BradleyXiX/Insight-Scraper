# Insight-Scraper — Production Hardening Design

**Date:** 2026-11-01
**Repo:** Insight-Scraper (Next.js 16.2.6 dashboard + FastAPI backend + PostgreSQL RLS + Stripe)
**Scope:** Close the five P0 production blockers. No feature work.
**Status:** Approved approach, pending design-doc sign-off.

---

## 1. Intent and why

Insight-Scraper is sold as a $750/mo B2B lead-enrichment subscription (weekly CSV/CRM delivery). Four recurring clients is the 90-day target. The product currently runs locally and demos well, but it cannot be sold or deployed because of five defects that only appear outside a developer machine.

The repo looks further along than it is. Three commits (`ae9b03c`, `d933998`, `e36216a`) already "fixed" the three blockers named in the venture directive. Reading the code confirms the features exist. Running the code confirms they do not work in production. The hardening pass therefore targets **deployment-path correctness and auth fail-closed behaviour**, not feature completion.

The commercial consequence is concrete:

- A deploy missing one env var serves every prospect's lead table to any anonymous caller. One incident ends the product.
- A deploy that builds cleanly still fails every login, because the Docker image lacks the crypto backend RS256 needs. The first paying client sees a broken dashboard.
- A client opening the exported CSV can execute attacker-controlled formula cells, because lead names come from scraped third-party pages.

## 2. Goals

1. Authentication fails **closed**. Missing configuration stops the process; it never grants access.
2. RS256 verification works in a clean Docker build, not just on the developer's machine.
3. The service binds whatever port the platform assigns.
4. Cross-origin access is allowlisted, not wildcarded.
5. The HTTP API cannot be used to make the server fetch internal hosts.
6. No request can hang indefinitely on the scraper.
7. Exported CSV cannot carry executable formula cells.
8. A regression suite exists, so none of the above silently reopens.

## 3. Non-goals

- New product features, new dashboard screens, visual redesign.
- Refactoring code that is clean and working.
- Multi-tenant billing changes, Stripe flow changes.
- Apollo / LinkedIn ingestion (rejected — see §6).
- Real Lighthouse scoring by default (opt-in only, see §6).
- The RLS `FORCE ROW LEVEL SECURITY` gap (noted in §10, deferred).

## 4. Anti-goals

These outcomes would count as failure even if every test passes:

- Auth still reachable in bypass mode in production under any env combination.
- The scraper "respects robots.txt" in a way that silently drops leads without telling the client why.
- A score labelled as Lighthouse that is actually a load-time heuristic.
- The local build agent bundling all patches into one commit, making review impossible.
- Adding a test framework that the team then does not run.

## 5. Constraints

| Constraint | Detail |
|---|---|
| No new runtime dependencies | `cryptography` arrives via the `PyJWT[crypto]` extra; `PyJWKClient`, `ipaddress`, `socket`, `urllib.robotparser`, `asyncio` are already available. |
| No new test framework | stdlib `unittest`. Frontend verifies via `tsc --noEmit`, `eslint`, `next build`. |
| Package manager | **npm** — `package-lock.json` is present. Do not use pnpm. |
| Node | v26.12.0 |
| Python | `venv` at repo root; PyJWT 2.14.0, FastAPI 0.141.1, SQLAlchemy 2.0.52, cryptography 50.0.2 |
| Next.js | 16.2.6, not 15. `apps/dashboard/AGENTS.md` warns APIs differ from training data and requires reading `node_modules/next/dist/docs/` before editing. The `01-app` guide is present. |
| Secrets | `.env` exists at repo root and is gitignored. It must never be read, logged, or committed. |
| Worktree | All work in `../worktrees/hardening-auth`, never on `main`. |
| Line numbers | The directive's references are stale. Patches anchor on exact code strings. |

## 6. Approaches considered

### 6.1 Blocker 2 — source expansion

| Option | Trade-off | Decision |
|---|---|---|
| **A1** Meta Ad Library via Graph `ads_archive` (token-gated) + real PageSpeed via free PSI API; drop Apollo/LinkedIn | Zero new deps (`requests` already present). PSI key optional. Both are sanctioned data access paths. | **Chosen as the Phase 2 direction — NOT built in this pass.** See §16.1. |
| A2 Apollo/LinkedIn scraping through camoufox | Free but violates LinkedIn ToS, burns accounts, brittle DOM, legal exposure on a paid product | Rejected |
| A3 Keep current three sources, document Meta/Apollo as roadmap | Honest and fastest, but leaves blocker 2 open | Fallback only |

Rationale for rejecting A2: the venture sells a recurring deliverable to agencies. An ingestion path that can be shut off by a ToS enforcement action is not a foundation for a $750/mo commitment. Meta Ad Library and PageSpeed Insights both expose intended, documented access.

### 6.2 Camoufox wiring

| Option | Trade-off | Decision |
|---|---|---|
| **B1** Extract the post-launch body into `_run_source_pipeline(browser, ...)`; add a `_launch_browser()` async context manager that prefers Camoufox when `USE_CAMOUFOX=true` and the optional package is installed, else hardened Playwright Chromium | Mechanical move of existing lines; graceful fallback; no hard dependency; keeps the repo runnable for anyone without camoufox | **Chosen** |
| B2 Hard-require camoufox | Breaks existing deployments and CI | Rejected |

### 6.3 Score honesty

| Option | Trade-off | Decision |
|---|---|---|
| **C1** Keep the `PageSpeed Score` CSV column for client-contract stability; add `Score_Source` (`lighthouse` \| `heuristic-load-time`). Real PSI only when `PAGESPEED_API_KEY` is set | Honest number, no column break, no cost by default | **Chosen** |
| C2 Rename the column | Breaks existing client imports | Rejected |
| C3 Always call PSI | Free tier is rate-limited and adds latency to every lead | Rejected as default; available as opt-in |

## 7. The five blockers, with root cause

### P0-1 — Auth fails open (`services/api/src/auth.py:18-31`)

`is_dev_bypass()` returns `True` when `CLERK_FRONTEND_API` is unset or contains `your-clerk`/`placeholder`. A deploy missing that one variable authenticates every anonymous request as tenant `local_operator`, exposing all leads stored under that tenant.

**Fix:** bypass requires `DEV_BYPASS_AUTH` explicitly truthy **and** `APP_ENV != "production"`. Missing config raises `RuntimeError` at import.

### P0-2 — RS256 dead in the Docker image (`services/api/src/requirements.txt:9`)

`PyJWT` without the `[crypto]` extra does not install `cryptography`. `jwt.algorithms.has_crypto` is then `False`, and `RSAAlgorithm.from_jwk()` raises `NotImplementedError`. `Dockerfile:11` installs only `requirements.txt`, so the image is broken. It works locally only because `venv` happens to contain `cryptography 50.0.2`.

**Fix:** `PyJWT[crypto]==2.14.0`.

### P0-3 — Hardcoded port (`main.py:194`, `Dockerfile:20`)

Platforms inject `$PORT`. Binding 8000 fails health checks.

### P0-4 — CORS wildcard with credentials (`main.py:17-23`)

`allow_origins=["*"]` + `allow_credentials=True` makes Starlette reflect the caller's origin. Combined with P0-1 this is an anonymous cross-origin read of the leads table.

### P0-5 — SSRF via `url_list` (`main.py:65`, `scraper_worker.py:252`)

Any authenticated tenant can pass `source=url_list` and make the server fetch arbitrary URLs, including cloud metadata endpoints.

**Fix:** remove `url_list` from the HTTP surface (CLI retains it), plus a DNS-resolution-based private-range guard in the worker as defence in depth.

## 8. P1 items included in scope

| ID | Item | Why it is in scope |
|---|---|---|
| P1-1 | JWKS cache never refreshes (`auth.py:33-44`) | Key rotation causes permanent 401 until restart. Fixed by `PyJWKClient`. |
| P1-2 | `subprocess.check_output` has no timeout (`main.py:41`) | Serial 16s audits over 25 leads can hang a request for 400s+. |
| P1-3 | CSV formula injection (`page.tsx:179`) | Scraped names reach a client's Excel. |
| P1-4 | Frontend ships `Bearer dev_bypass_token` (`page.tsx:112`, `:213`) | Leaks a dev concept into production builds. |
| P1-5 | `NEXT_PUBLIC_API_URL=http://api:8000` in compose | `NEXT_PUBLIC_*` is inlined at build time and `api` is Docker-internal; browsers cannot resolve it. |
| P2 | `camoufox_available` computed and never used (`scraper_worker.py:611-618`); `--disable-web-security` (`:627`) | Dead code misrepresents capability; unnecessary attack surface. |
| P2 | Score labelled as Lighthouse but is a load-time heuristic | Misrepresentation risk on a paid deliverable. |

## 9. Decisions taken (and what was left to the builder)

**Decided with the operator:**
- A1 over A2/A3 for source expansion.
- B1 for camoufox.
- C1 for score labelling.
- stdlib `unittest` over pytest.
- Ship patches individually, one commit each, in the order in §11.

**Left to the builder:**
- Exact wording of the `RuntimeError` message and log lines.
- Whether `_ROBOTS_CACHE` is module-level or passed through the pipeline.
- How `_enrich_candidate` handles a single-lead exception (drop the lead vs. return a partial row). Recommended: drop the lead and log to stderr; do not fail the batch.
- Test file layout inside `services/api/tests/`.
- Whether the PSI call lands in this pass or a follow-up (the `Score_Source` field must exist either way).

## 10. Patch contract

Full BEFORE/AFTER text lives in the approved hardening contract. Summary of files touched:

| # | File | Change |
|---|---|---|
| 1 | `services/api/src/requirements.txt` | `PyJWT` → `PyJWT[crypto]==2.14.0` |
| 2 | `services/api/src/auth.py` | Full rewrite: fail-closed bypass, `PyJWKClient`, issuer/`azp` checks, no error-text leakage |
| 3 | `services/api/src/main.py` | Env-driven CORS (fail-closed in prod), `Query` validation, `url_list` removed from HTTP surface, subprocess timeout, `$PORT`. **The `db` dependency stays** — it feeds the Stripe 402 gate at `main.py:77`. See §16.9. |
| 4 | `services/api/Dockerfile` | `${PORT:-8000}` |
| 5 | `apps/dashboard/src/app/dashboard/page.tsx` | Build-time API URL with prod guard, remove dev token, CSV injection guard + BOM + deferred revoke, pitch string aligned with worker |
| 6 | `services/api/src/scraper_worker.py` | `_launch_browser()` + `_run_source_pipeline()` split, SSRF guard, robots.txt, dedupe, bounded concurrency, honest score label, remove `--disable-web-security` |
| 7 | `docker-compose.yml` + `apps/dashboard/Dockerfile` | `NEXT_PUBLIC_API_URL` as build arg |
| 8 | `.env.example` | New, no secrets |

**Correction — RLS is already correct.** An earlier draft of this doc listed `ALTER TABLE leads FORCE ROW LEVEL SECURITY` as a deferred gap. It is not a gap: `init_db.py:40` already applies `FORCE ROW LEVEL SECURITY` to `subscriptions`, `search_history`, and `leads`, with a `tenant_isolation_policy` at `init_db.py:34-37`. No migration is needed. Verified 2026-11-01.

## 11. Execution order

```
1.  PATCH 1  requirements.txt          verify: docker build + has_crypto
2.  PATCH 8  .env.example              verify: n/a
3.  PATCH 2  auth.py + tests 1-10      verify: unittest
4.  PATCH 3  main.py + tests 11-15     verify: unittest
5.  PATCH 4  Dockerfile                verify: docker build
6.  PATCH 5  page.tsx + manual 21-22   verify: tsc + lint
7.  PATCH 6a scraper split             verify: unittest 16-20 (no logic change)
8.  PATCH 6c/d/f SSRF/robots/dedupe    verify: unittest
9.  PATCH 6e concurrency               verify: manual timing
10. PATCH 6g/b label + flag cleanup    verify: unittest
11. PATCH 7  compose build args        verify: docker compose config
```

Step 6a is a pure move-and-dedent. The diff must show zero changed statements inside the moved block.

## 12. Verification

**Backend**
```powershell
.\venv\Scripts\python.exe -m compileall -q services\api\src
.\venv\Scripts\python.exe -m unittest discover -s services\api\tests -v
```

**Frontend** (from `apps/dashboard`)
```powershell
npx tsc --noEmit
npm run lint
npm run build
```
`next build` needs Clerk keys; run it in CI, use `tsc` + `lint` locally.

**Deployment proof**
```powershell
docker build -t insight-api ./services/api
docker run --rm -e APP_ENV=production insight-api python -c "import jwt.algorithms as a; assert a.has_crypto; print('RS256 OK in image')"
```
Before PATCH 1 this fails. That is the reproduction.

## 13. Test assertions (write before the patch)

`services/api/tests/test_auth.py` — 1: missing config raises at import. 2: `APP_ENV=production` ignores `DEV_BYPASS_AUTH=true`. 3: dev bypass honours `DEV_TENANT_ID`. 4: no credentials → 401. 5: token signed with a different RSA key → 401. 6: valid token returns `org_id`. 7: valid token without `org_id` → 403. 8: expired → 401. 9: wrong `iss` → 401. 10: unknown `kid` triggers refetch, not a 500.

`services/api/tests/test_main.py` — 11: `limit` 0 and 101 → 422. 12: `region=XX` → 422. 13: `source=url_list` → 422. 14: worker timeout returns `[]`. 15: non-allowlisted origin gets no CORS header.

`services/api/tests/test_scraper_worker.py` — 16: `127.0.0.1`, `169.254.169.254`, `10.0.0.5` rejected. 17: `https://example.com` allowed. 18: dedupe key collapses `www.` and case. 19: `_get_pitch_hook(3500, True)` → speed pitch. 20: `_get_pitch_hook(1200, False)` → RAG pitch.

Manual — 21: CSV containing `=1+1` opens in Excel as literal text. 22: missing `NEXT_PUBLIC_API_URL` in a production build logs an error and makes no localhost request.

## 14. Edge cases

| Case | Required behaviour |
|---|---|
| `CLERK_FRONTEND_API` empty, `DEV_BYPASS_AUTH` unset | Process refuses to start |
| `APP_ENV=production`, `DEV_BYPASS_AUTH=true` | Bypass ignored |
| Clerk rotates keys mid-session | `PyJWKClient` refetches on unknown `kid` |
| JWKS endpoint down at boot | Lazy client; first request 500s, no crash loop |
| User with no Clerk org | 403, never a default tenant |
| `url_list` with a metadata IP | Rejected before `goto` |
| Site disallows the bot | Lead retained, `Audit_Skipped="robots.txt"`, no fetch |
| Worker exceeds 300s | `[]` + stderr note |
| Same query run twice in one worker pass | Deduped rows within that run (worker-local). Cross-run dedupe is Phase 2 — see §16.6. |
| Lead name `=cmd\|'/c calc'!A0` | Exported as literal text |
| `NEXT_PUBLIC_API_URL` missing in prod build | Console error, no localhost fallback |
| `USE_CAMOUFOX=true`, package absent | Warning + Playwright fallback |
| DB role owns `leads` | RLS bypassed — deferred, §10 |

## 15. What success looks like

- `docker run -e APP_ENV=production` refuses to start without Clerk config, and starts correctly with it.
- `has_crypto` is `True` in the image.
- The unittest suite is green and covers all 20 backend assertions.
- `tsc --noEmit` and `eslint` are clean.
- A CSV exported from a lead named `=1+1` opens as text in Excel.
- No request path can reach an internal IP or run longer than `SCRAPE_TIMEOUT_SECONDS`.

---

## 16. Resolutions after builder check (2026-11-01)

A fresh reviewer read this doc and the source. Ten gaps came back. All are resolved below; **none require another decision from the operator.** Where a resolution shrinks scope, that is deliberate — this pass closes security and correctness, nothing else.

### 16.1 Meta Ad Library is deferred to Phase 2

§6.1 chose approach A1, but §2's goals and §10's patch table never contained a new source. That contradiction is resolved in favour of **not building it here**. Adding `meta-ads` would ripple into the `source` validation regex in `main.py`, `SOURCE_OPTIONS` in `page.tsx:51-55`, the DB shape, and the CSV headers — a feature, not a hardening patch. A1 remains the agreed direction for the phase after the five P0s are green. No `META_AD_ACCESS_TOKEN` is read in this pass.

### 16.2 `Score_Source` is dropped; the existing label is made honest instead

The reviewer correctly found that the export has **no PageSpeed column at all** (`page.tsx:136-149`), so "preserving the client contract" was meaningless. The score reaches clients only as a substring of the contact field, built at `main.py:104`:

```python
extras.append(f"Speed: {lead.get('Mobile Load Time', '')} ({lead.get('PageSpeed Score')})")
```

Persisting a new `score_source` column would need `models.py`, an `init_db.py` `ADD COLUMN IF NOT EXISTS`, a `/api/leads` response change, and CSV header changes — four files for a labelling fix. Instead: **change the literal `"Speed:"` to `"Perf est.:"`** in `main.py:104`. One string, no schema change, and the number stops masquerading as a Lighthouse measurement. The worker-side `_calculate_pagespeed_score` → `_estimate_perf_score` rename and docstring fix stay (PATCH 6g).

### 16.3 CORS fails closed in production

No real production origins exist in the repo, so none are guessed. `CORS_ALLOWED_ORIGINS` is comma-separated and defaults to `http://localhost:3000`. **When `APP_ENV` resolves to production and the variable is empty or unset, `main.py` raises `RuntimeError` at import** — the same fail-closed treatment as auth. Test 15 therefore runs against a non-allowlisted origin in a dev-configured app.

### 16.4 `azp` semantics, stated explicitly

`CLERK_AUTHORIZED_PARTIES` is a comma-separated allowlist of frontend origins.

| Allowlist | Token `azp` | Result |
|---|---|---|
| empty/unset | anything | check skipped (documented, not silent) |
| non-empty | in list | allowed |
| non-empty | not in list | **401** |
| non-empty | absent | **401** — an allowlist you can bypass by omitting a claim is not an allowlist |

### 16.5 `APP_ENV` unset now means production

This was the sharpest finding: with `APP_ENV` unset and `DEV_BYPASS_AUTH=true` (a copied `.env`), auth would still be wide open — the exact failure this pass exists to close. **Unset `APP_ENV` resolves to `"production"`.** Only the literal values `development`, `dev`, and `test` count as non-production. Consequence: local runs and `docker compose up` must set `APP_ENV=development` explicitly. `.env.example` does, and the README line is updated. This is a deliberate ergonomics cost paid for a fail-safe default.

### 16.6 Dedupe is worker-local only

The worker never sees prior rows, so it cannot dedupe across requests. §14's row is corrected to "within one worker pass". Cross-run dedupe needs a `dedupe_hash` column, a unique index, and an upsert policy in the `/api/scrape` insert loop (`main.py:98-123`) — a Phase 2 item, not a hardening patch.

### 16.7 robots.txt gates prospect audits only

The worker fetches four URL classes: directory/source pages (`:360`, `:415`, `:500`, `:550`), the prospect homepage (`:252`), and a discovered contact page (`:317`). Gating the directories would gut lead volume and destroy the product. **The gate applies to `_audit_website_signal` and the contact-page follow only.** A robots.txt fetch failure fails **open** (logged), never silently drops a lead. The UA token matched is `_ROBOTS_UA`; sites that only allow `*` still pass.

### 16.8 API tests use a stdlib ASGI shim, not httpx

Verified: `httpx` is **not** installed, and `starlette.testclient` imports it. Rather than add a dependency, add `services/api/tests/asgi_client.py` — a ~40-line helper that drives the app directly:

```python
async def call(app, method, path, *, query=None, headers=None):
    scope = {"type": "http", "method": method, "path": path,
             "query_string": urlencode(query or {}).encode(),
             "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]}
    ...
```

Tests 11-15 assert on `status` and on the presence/absence of `access-control-allow-origin`. Zero new packages.

**Import-order constraint:** `main.py` imports `db` (which builds an engine at `db.py:9`) and `auth` (which now raises on missing config). Every test module sets env in `setUpModule` and imports inside the test via `importlib`, so a misconfigured environment fails the test rather than the test runner. No app factory refactor.

### 16.9 The `db` dependency stays in `/api/scrape`

My patch contract was wrong. `db` is not unused: `main.py:68` supplies it and `main.py:77` passes it to `stripe_service.get_tenant_status(db, tenant_id)`. Removing it would break the 402 payment gate. **Keep the dependency and its `Depends(get_db)`.** No behavioural change to the Stripe path in this pass.

### 16.10 Camoufox is a local-only toggle

Installing camoufox in the image requires a separate browser-build fetch at image-build time (size and fragility). **The Docker image stays Playwright-only.** `USE_CAMOUFOX=true` without the package logs a warning and falls back — it never fails a scrape. `.env.example` documents the toggle as local-only. Detection is the optional `from camoufox.async_api import AsyncCamoufox` import, not `shutil.which("camoufox-cli")`.

### 16.11 Minor items settled

- `SCRAPE_TIMEOUT_SECONDS` defaults to **300** and is added to `.env.example` and the PATCH 3 contract.
- `subprocess.run(timeout=...)` kills the worker but not its Chromium children. The builder should use `subprocess.run(..., timeout=..., start_new_session=True)` on POSIX and `creationflags=CREATE_NEW_PROCESS_GROUP` on Windows, then kill the process group. This is an implementation choice, not a spec question; if it proves fiddly, ship the timeout alone and file the orphan cleanup as a follow-up.
- `_enrich_candidate` drops a single failed lead and logs to stderr; it never fails the batch.
- `_ROBOTS_CACHE` is module-level, matching the existing module-level `USER_AGENTS` and `REGION_METADATA` style.

### 16.12 Net effect on the plan

Scope **shrank** by three items (Meta Ads, `Score_Source` persistence, cross-run dedupe) and **grew** by one (`.env.example` now carries `APP_ENV` and `CORS_ALLOWED_ORIGINS`, and `main.py` gains a second import-time guard). The patch count stays at 8. No new dependencies. No schema migration.
