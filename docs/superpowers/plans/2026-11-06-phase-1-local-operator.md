# Phase 1 — Local-Complete Operator

**Date:** 2026-11-06
**Status:** complete (2026-11-07)
**Parent:** `docs/product/2026-11-06-completion-assessment.md`

## Goal

A person can start the stack, run scrapes, watch real progress, cancel one, browse
history, change defaults, and export results without a Clerk sign-in or a Stripe
subscription.

## Done when

1. `NEXT_PUBLIC_AUTH_MODE=local` opens `/dashboard` with no Clerk session.
2. A scrape creates a job, the UI polls real status, and Cancel stops the worker.
3. History lists runs with pagination, opens a run's leads, re-runs it, and deletes it.
4. Settings persist workspace defaults (region, source, limit).
5. CSV and JSON export work for the current set and for a stored run.
6. Re-running a query does not insert duplicate leads.
7. Every failure mode shows a specific next action.

## Design decisions

- **Local mode is explicit:** `NEXT_PUBLIC_AUTH_MODE=local` (or missing Clerk keys)
  disables route protection and renders an operator badge. Hosted mode is unchanged.
- **Jobs are database rows, not in-memory state:** they survive a UI refresh and are
  the history. In-process cancellation works because the API runs one worker; a
  distributed queue is Phase 2.
- **The worker runs as an asyncio subprocess**, so Cancel can terminate it. A restart
  marks unfinished jobs failed instead of leaving them "running" forever.
- **Dedupe key is `(tenant, normalised website, normalised name)`**, compared against
  the tenant's existing leads. Duplicates are counted on the job, not silently dropped.
- **The UI polls** `GET /api/jobs/{id}`; the three-stage strip reflects real state.

## Tasks

### Backend

1. `models.py`: add `ScrapeJob` and `Lead.job_id`; add `WorkspaceSettings`.
2. `db.py`: skip `SET LOCAL` on SQLite so tests can run without Postgres.
3. `scraper_runner.py`: async subprocess runner with timeout, stderr capture and
   process handle for cancellation.
4. `jobs.py`: create, execute, cancel, recover-stale, save-with-dedupe, serialise.
5. `main.py`: job endpoints, settings endpoints, history pagination, job leads,
   delete, re-run. Keep `/api/scrape` as the create-job entry point (202).
6. `init_db.py`: add `leads.job_id` and RLS policy for `scrape_jobs` and
   `workspace_settings`.

Endpoints:

```
POST   /api/scrape                 -> 202 {job}
GET    /api/jobs?limit&offset      -> {jobs, total}
GET    /api/jobs/{id}              -> {job}
GET    /api/jobs/{id}/leads        -> {job, leads}
POST   /api/jobs/{id}/cancel       -> {job}
POST   /api/jobs/{id}/rerun        -> 202 {job}
DELETE /api/jobs/{id}              -> 204
GET    /api/settings               -> settings
PUT    /api/settings               -> settings
```

### Frontend

7. `lib/auth-mode.ts`, `components/Providers.tsx`, `lib/app-auth.tsx`: one auth
   surface for Clerk and local modes.
8. `middleware.ts`: bypass Clerk protection in local mode.
9. `sign-in` / `sign-up`: redirect to `/dashboard` in local mode.
10. `dashboard/page.tsx`: create job, poll status, cancel, map errors, export CSV/JSON.
11. `lib/errors.ts`: status-code to message and next action.
12. `dashboard/history/page.tsx`: paginated runs, open, re-run, delete, export.
13. `dashboard/settings/page.tsx`: persisted defaults form.
14. `dashboard/layout.tsx`: operator badge instead of Clerk controls in local mode.
15. `lib/leads.ts`: JSON export helper.

### Tests

16. `tests/test_jobs.py`: create -> running -> succeeded, cancel, failure, dedupe,
    tenant scoping, pagination.
17. `tests/test_settings.py`: defaults and update validation.
18. Extend validation tests for the new body/query models.
19. Browser verification at 390px and desktop against a local build.

Playwright e2e automation is deferred to the CI work in Phase 2; this phase verifies
with the browser tool and documents the manual path.

## Verification

```powershell
.venv\Scripts\python -m pytest services/api/tests -q
cd apps/dashboard
npm run lint:design
npm test
npx tsc --noEmit
npm run build
```

## Outcome (2026-11-07)

All seven "done when" conditions were exercised against a real local stack
(SQLite + uvicorn on :8000, `next dev` on :3000) with Chromium installed:

| Check | Result |
|---|---|
| `/dashboard` opens with no Clerk session | Pass — operator badge, no sign-in controls |
| Scrape creates a job and the UI polls it | Pass — 10 leads from `plumbers in Manchester` |
| Cancel stops the worker | Pass — run stored as `cancelled`, history agrees |
| History paginates, opens, re-runs, deletes | Pass — open showed 10 leads; delete removed a run |
| Settings persist | Pass — limit 25 survived a reload |
| CSV and JSON export | Pass — 3,742 B CSV and 5,855 B JSON |
| Dedupe on re-run | Pass — a repeated query saved 2 new leads, 8 duplicates |
| 390px and desktop layout | Pass — no horizontal overflow |

Bugs found and fixed during verification:

- A failed worker reported Playwright's decorative banner (`╚═══╝`) instead of the
  real error. `scraper_runner.summarize_stderr` now returns an actionable line and
  maps a missing browser to `playwright install chromium`.
- The lead table said "No leads found" while a run was still extracting, after a
  cancel, and after a failure. The empty state now matches the run's real outcome.
- The desktop lead table overflowed its panel and clipped the pitch column; it is now
  fixed-width with compact pitch labels (full text remains in exports and the title).
- A bare status dot showed in the mobile header with no label next to it.

Test count grew from 48 to 60 (added `test_scraper_runner.py` and the settings/jobs
suites). `npm run lint` is clean, `design-lint` is clean, and 15 frontend unit tests
pass.

## Out of scope

Hosted organizations, RLS cross-tenant tests, quotas, rate limits, a distributed
queue, Stripe checkout/portal. Those remain Phase 2 and Phase 3.
