# Insight Scraper — Completion Assessment and Roadmap

**Date:** 2026-11-06
**Status:** assessment for approval. No phase below is approved yet.
**Immediate fix already shipped on branch `fix/auth-theme-and-contrast`:** Clerk v7 theme
variables corrected, Clerk CSS layered under Tailwind, disabled-button contrast fixed,
dashboard labels raised to WCAG AA.

---

## 1. Verdict

The interface is at a professional standard. The product underneath it is not yet a
working multi-tenant SaaS. The gap is not visual — it is the distance between what the
site promises and what the code does.

**Recommendation: finish this project now, but finish it in gates, not in one push.**

Reasons:

1. The expensive design work is done. What remains is integration, state, error handling,
   tests and documentation — work that benefits directly from the context already loaded.
2. Leaving it now leaves the worst possible state: a public site that makes claims the
   product cannot meet. That is a credibility risk, not just a missing feature.
3. The other projects (DataTurf, SupportGeniusAI) are separate contexts. The way to stop
   losing context is to write decisions into the repo — which this document and the
   per-phase plans do. My memory is not the artifact; the repo is.
4. "Finish everything" should not mean "build every advertised feature". Several claims
   (10x concurrency, 99.9% SLA, automated enrichment, unlimited searches) are not in the
   code and are not required to run this locally. The cheapest correct fix is usually to
   remove the claim, not to build the feature.

**"Works perfectly" is not a finish line for a scraper.** Third-party sites change, block,
and rate-limit. The honest target is: the product never lies about what happened, never
loses a run silently, and degrades with a clear error instead of a blank screen. That is
achievable and testable. Perfect extraction on every site is not.

---

## 2. What actually works today

| Area | State | Evidence |
|---|---|---|
| Marketing site, pricing page | Real, on-brand, responsive | `apps/dashboard/src/app/page.tsx`, `pricing/page.tsx` |
| Clerk sign-in / sign-up | Now readable and themed | `lib/clerk-appearance.ts`, verified locally |
| Dashboard shell, nav, mobile drawer | Real, accessible | `app/dashboard/layout.tsx`, `SidebarNav.tsx` |
| Scrape trigger → backend → table | End-to-end in principle | `app/dashboard/page.tsx`, `main.py:/api/scrape` |
| Lead table, mobile cards, KPI strip | Real | `LeadResults.tsx`, `KpiStrip.tsx` |
| CSV export (current in-memory set) | Real | `lib/leads.ts:toCsv` |
| PostgreSQL schema + RLS policies | Real, but untested | `models.py`, `init_db.py` |
| Stripe Checkout session creation | Code exists, never exercised | `api/stripe/checkout/route.ts` |
| Local backend bypass | Real | `auth.py:is_dev_bypass` |
| Unit tests | 14 tests, frontend lib only | `src/lib/*.test.ts` |

---

## 3. What is advertised, assumed, or shown but not true

Severity: **S1** blocks real use or is a security/truth problem; **S2** makes a feature
unusable; **S3** polish or operational gap.

| # | Sev | Finding | Evidence |
|---|---|---|---|
| 1 | S1 | **Production auth and paywall are disabled.** `render.yaml` sets `DEV_BYPASS_AUTH=true` for the deployed API, so every caller is `local_operator` and the 402 gate never runs. | `render.yaml:24-27`, `auth.py:54-55` |
| 2 | S1 | **Auth fails open.** If `CLERK_FRONTEND_API` is missing, `is_dev_bypass()` returns `True`. A misconfigured deployment becomes public. | `auth.py:27-31` |
| 3 | S1 | **The deployed dashboard cannot reach the API.** The live page shows "Could not reach the extraction service." Either `NEXT_PUBLIC_API_URL` is unset, the Render service is cold/asleep, or CORS is failing. Needs a health probe and a distinct error message per cause. | `dashboard/page.tsx:64`, live site |
| 4 | S1 | **`/api/scrape` is one blocking HTTP request.** It runs Playwright, audits up to 25 sites, then returns. Long runs hit proxy/render timeouts and the UI cannot recover. Cancel only aborts the browser request; the worker keeps running. | `main.py:61-133`, `dashboard/page.tsx:87-93` |
| 5 | S1 | **CORS is `allow_origins=["*"]` with `allow_credentials=True`.** Invalid combination and far too broad. | `main.py:17-23` |
| 6 | S1 | **`limit` is unvalidated.** Any caller can request an arbitrarily large scrape. No rate limit, quota, or query-length check anywhere. | `main.py:66`, `scraper_worker.py:707` |
| 7 | S2 | **History is written but never read.** `SearchHistory` rows are inserted; there is no `/api/history`; the page says "History is not available in this build." | `main.py:93`, `history/page.tsx:13` |
| 8 | S2 | **Settings is a placeholder.** Safe to defer, but the nav advertises it. | `settings/page.tsx:13` |
| 9 | S2 | **No dedupe.** Re-running a query inserts duplicate leads and inflates KPIs. | `main.py:98-123` |
| 10 | S2 | **Billing page has no current plan, no portal, no cancel.** "Cancel anytime" has no implementation. It also advertises features that do not exist: 10x concurrency, JSON export, automated enrichment, unlimited searches. | `billing/page.tsx:8-22`, `page.tsx:33` |
| 11 | S2 | **PageSpeed is approximated from load time**, not Google PageSpeed/Lighthouse. The label overstates it. | `scraper_worker.py:235-253` |
| 12 | S2 | **Stripe price is taken from the client** in the backend `/api/checkout`; the UI uses the Next route instead. Two checkout paths, one unvalidated. No webhook is registered; the webhook secret defaults to `whsec_123`. | `main.py:140-154`, `stripe_service.py:10` |
| 13 | S2 | **RLS is unverified.** `SET LOCAL` is used without tests or an explicit transaction boundary; a second transaction in the same session loses the tenant setting. | `db.py:19-31` |
| 14 | S2 | **Local use still requires Clerk sign-in and an organization** because middleware protects `/dashboard` unconditionally. The backend bypass does not help the frontend. | `middleware.ts:4-8` |
| 15 | S3 | **Dead code:** `services/api/src/dashboard.py` imports `get_nairobi_leads`, which no longer exists, and requires Streamlit, which is not in requirements. | `dashboard.py:10` |
| 16 | S3 | **Docs are aspirational, not accurate:** README says Next.js 15 and "glassmorphic", describes async scraping and ironclad RLS, and omits the backend env reference. `apps/dashboard/README.md` is create-next-app boilerplate. | `README.md`, `apps/dashboard/README.md` |
| 17 | S3 | **No CI.** No backend tests, no e2e tests, no lint/type gate on push. | no `.github/` |
| 18 | S3 | **No observability:** no structured logs, request IDs, Sentry, or metrics. | — |

---

## 4. Phase plan and acceptance criteria

Each phase produces working, testable software on its own. Payments are deliberately
last, because local use needs none of it.

### Phase 0 — Truth and safety (≈1 day)

Remove the ways this can hurt you or mislead a visitor before adding features.

- Delete the production dev bypass from `render.yaml`; make missing auth config **fail
  closed**.
- Restrict CORS to configured origins.
- Validate `limit` (1–100), query length, region and source enums.
- Remove or rewrite every claim that is not implemented (billing feature list, pricing
  FAQ, PageSpeed wording, "unlimited").
- Delete the dead Streamlit dashboard.
- Add a backend `.env.example` and a health/readiness distinction.

**Done when:** a request with no token to a production-configured API returns 401; a
request from an unlisted origin is rejected; a `limit=10000` request is rejected; no page
claims a feature that has no code path.

### Phase 1 — Local-complete operator (≈4–6 days)

The goal you actually stated: run it on your machine, use it daily, no payments.

- One-command local stack with health checks (Postgres + API + dashboard).
- **Local operator mode**: an env flag that lets `/dashboard` open without Clerk and
  uses `local_operator` end-to-end. Hosted mode keeps Clerk.
- Job model: `POST /api/scrape` creates a job and returns an id; `GET /api/jobs/{id}`
  reports real state; `POST /api/jobs/{id}/cancel` stops the worker. The UI's three stages
  are driven by that state, not by a timer.
- History: list runs with query, region, source, count and timestamp; open a run's leads;
  re-run; delete. Pagination.
- Settings: workspace defaults (region, source, limit) and a clear account section.
- Export CSV **and** JSON per run and for the current set.
- Dedupe on `(tenant_id, website, business_name)` within a recent window.
- Error taxonomy in the UI: offline / cold start / 401 / 402 / 403 / 5xx / empty, each with
  the correct next action.
- Tests: pytest for auth, tenant isolation, job lifecycle, history and limits; Playwright
  e2e for local operator mode.

**Done when:** you can start the stack from a clean clone, run three different queries,
watch real progress, cancel one, open history, export both formats, and restart the stack
without losing data — with no Clerk account and no Stripe key.

### Phase 2 — Hosted, multi-tenant SaaS (≈4–6 days)

Only needed once you invite other people.

- Real Clerk auth + organization onboarding; org required only in hosted mode.
- RLS tests with two tenants proving cross-tenant reads return zero rows.
- Postgres-backed or Redis-backed job queue; scraping runs outside the request.
- Per-tenant quotas, rate limits, usage metering.
- Structured logs, request IDs, Sentry, health/readiness probes.
- GitHub Actions: design-lint, ESLint, `tsc`, unit tests, `pytest`, `next build`.
- Deployment runbooks, migrations, backups, retention, privacy and terms pages.

**Done when:** two organizations can use the hosted app simultaneously and neither can
see the other's leads or history, even with a forged tenant id; CI blocks a failing build.

### Phase 3 — Payments (≈3–5 days)

- One checkout path, server-side price IDs, validated.
- Stripe webhook registered and tested with the Stripe CLI; no default secrets.
- Customer portal: update card, cancel, resume, invoices.
- Current plan and status shown in Billing; 402 errors link directly to the fix.
- Trial and grace period decided explicitly.
- Test-mode end-to-end: subscribe → webhook → status active → scrape allowed → cancel →
  status canceled → scrape returns 402.

**Done when:** the full lifecycle works in Stripe test mode and the app's entitlement
state always matches Stripe's.

### Phase 4 — Scraper quality and docs (continuous, ≈3–7 days)

- Per-source recorded fixtures and tests; retries and per-lead failure isolation.
- Honest signal naming; optional real PageSpeed API integration.
- Concurrency and memory limits that fit the deployment target.
- Documentation set: `README`, architecture, local runbook, API reference, security model,
  deployment, troubleshooting, contributing.

**Done when:** each source has a test that fails when its selectors break, and a new
developer can run the stack from the docs alone.

---

## 5. Estimates

Human-equivalent focused effort, one developer:

| Scope | Estimate | Result |
|---|---|---|
| Phase 0 | 1 day | Safe, truthful, no public footguns |
| Phase 1 | 4–6 days | Works locally, end-to-end, with history/settings/exports |
| Phase 2 | 4–6 days | Real multi-tenant hosted product |
| Phase 3 | 3–5 days | Paid subscriptions working in test and live |
| Phase 4 | 3–7 days | Scraper reliability and full documentation |
| **Total** | **15–25 focused days** | Before open sign-ups |

As an agent working in this repo, expect roughly 4–8 working sessions for Phases 0–3,
with Phase 4 spread across them. The estimate is dominated by two unknowns: third-party
scraper brittleness (Phase 4) and the Render free-tier memory/time limits (Phase 2).

Do **not** quote a date for "perfect". Quote Phase 1's done-when list. It is verifiable.

---

## 6. Risks

1. **Scraper brittleness (highest).** Google Maps, DuckDuckGo and YellowPages change DOM,
   add consent walls, and rate-limit by IP/region. No amount of frontend work fixes this.
   Mitigation: fixtures, retries, per-source health, honest failure states.
2. **Render free tier.** 512 MB and cold starts are a poor fit for Chromium plus 25 site
   audits. Phase 2 should either move the worker to a small paid instance or cap
   concurrency hard.
3. **OneDrive.** This working tree lost 26 tracked files before this session started. That
   is the classic OneDrive + `node_modules`/file-lock failure. Move the repo to a plain
   directory (e.g. `C:\dev\Insight-Scraper`) before serious work.
4. **Two checkout paths.** Keep one. Remove the backend `/api/checkout` or the Next route.
5. **"Perfect" scope creep.** Every phase needs a fixed done-when list; otherwise this
   becomes an infinite polish loop.

---

## 7. Decisions needed before Phase 1

1. **Local auth:** should local mode open `/dashboard` without Clerk (operator mode), or
   keep the Clerk sign-in and require a dev account/organization? Operator mode is faster
   for solo use; Clerk mode keeps the production path exercised.
2. **Settings scope:** workspace defaults only, or also API keys and team management?
   Default recommendation: defaults + account link. Team management belongs to Clerk.
3. **Advertised features:** build or remove? Recommended removals: 10x concurrency,
   99.9% SLA, automated enrichment, unlimited searches, JSON export until implemented.
   "Priority support" becomes an email address, not a queue.
4. **Deployment target after local:** stay on Render free (accept cold starts and caps) or
   budget a small paid worker + managed Postgres?

---

## 8. Immediate next step

Approve Phase 0 and Phase 1. I will then write the task-by-task implementation plan for
Phase 0 (small enough to execute in one pass), execute it, and follow with the Phase 1
plan. Payments stay untouched until Phase 3.

---

## 9. Phase 0 outcome (2026-11-06)

Approved and completed on branch `fix/auth-theme-and-contrast`. Plan:
`docs/superpowers/plans/2026-11-06-phase-0-truth-and-safety.md`.

**Changed**

- Auth now fails closed: no bypass from missing Clerk config, no bypass in production,
  and a production process refuses to start with `DEV_BYPASS_AUTH=true`.
- `render.yaml` no longer sets the bypass; it sets `ENVIRONMENT=production` and an
  explicit `ALLOWED_ORIGINS`.
- CORS comes from `ALLOWED_ORIGINS`, with no wildcard.
- Scrape input is validated (`query` 2–200, six regions, three sources, `limit` 1–50).
- A worker failure returns `502`, a timeout `504`, an unconfigured billing system `503`,
  and a successful empty run `200` with `status: "empty"`. The UI can now tell these
  apart instead of showing one generic failure.
- `/api/checkout` (client-supplied price id) and the dead Streamlit dashboard were
  removed.
- Stripe no longer falls back to `sk_test_123` / `whsec_123`.
- `/health/ready` checks the database; `/health` stays a liveness probe.
- Every unimplemented marketing claim was removed from the landing FAQ, pricing page
  and billing page.
- Added `services/api/.env.example`, `requirements-dev.txt`, and 32 pytest tests.

**Verified**

- 32 backend tests pass.
- `design-lint` clean, 14 frontend tests pass, `tsc --noEmit` clean, production build
  passes.
- `PyJWT[crypto]` is now explicit (plain `PyJWT` cannot verify RS256).
- SQLAlchemy is pinned below 2.1, which silently switched the default Postgres driver
  to psycopg v3 and would have broken the Render connection string.

**Known, deliberately deferred**

- `npm run lint` reports 7 `react-hooks/set-state-in-effect` errors in mount and
  reduced-motion effects. They predate this work and need behavioral care, so they
  belong with the Phase 1 UI work rather than a copy/config pass.
- The dashboard still requires Clerk. Backend-only local runs work with the bypass;
  dashboard operator mode is Phase 1.

---

## 10. Phase 1 outcome (2026-11-07)

Completed on the same branch. Plan:
`docs/superpowers/plans/2026-11-06-phase-1-local-operator.md`.

**What now works end to end, without Clerk or Stripe**

- `NEXT_PUBLIC_AUTH_MODE=local` opens `/dashboard` with no sign-in. The API runs with
  `DEV_BYPASS_AUTH=true` and every request is scoped to `DEV_TENANT_ID`.
- A scrape is a database row, not a held-open request: `POST /api/scrape` returns `202`,
  the worker runs as a cancellable subprocess, and the UI polls `GET /api/jobs/{id}`.
- Cancel terminates the worker and records `cancelled`.
- History lists runs with pagination, opens a run's leads, re-runs the same parameters,
  and deletes a run with its leads.
- Settings persist workspace defaults (region, source, limit).
- CSV and JSON export work for the current set and for any stored run.
- Dedupe on `(tenant, normalised website, normalised name)` reports duplicates on the
  job instead of silently dropping them.
- SQLite is a supported local database; `init_db` skips RLS there and relies on the
  explicit tenant filters.

**Verified**

- 60 backend tests pass (up from 32).
- 15 frontend unit tests, `design-lint`, `npm run lint`, `tsc --noEmit` and a
  production build all pass in both `local` and `clerk` modes.
- A real local run produced 10 leads, exported both formats, cancelled a run, opened and
  deleted a stored run, and persisted settings, at 1440px and 390px.

**Fixed while verifying**

- Worker failures surfaced Playwright's ASCII banner instead of the actual error.
- The empty lead table claimed "no leads" during runs, after cancels and after failures.
- The desktop lead table clipped its last column; it is now fixed-width.
- An unlabelled status dot appeared in the mobile header.

**Still open (Phase 2 and 3)**

- Cross-tenant RLS tests, quotas and rate limits, a distributed queue.
- CI (GitHub Actions) and Playwright e2e automation.
- Stripe checkout, portal and the entitlement lifecycle.
- Structured logging and observability.

