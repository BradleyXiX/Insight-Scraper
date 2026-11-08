# Phase 2 — Reliability and Lead Throughput

**Date:** 2026-11-07
**Status:** design for approval
**Supersedes:** the "Phase 2 — Hosted, multi-tenant SaaS" section of
`docs/product/2026-11-06-completion-assessment.md`

---

## 1. Intent

Insight Scraper is not a product being sold. It is the machine that produces the
user's own pitch list: a solo software developer who finds businesses with weak web
presence and pitches them work. Income comes from pitches sent, and pitches sent come
from leads collected. The tool's job is to make that loop fast and trustworthy.

The roadmap's Phase 2 was written for a hosted multi-tenant SaaS with paying
organizations. That is not what this is. There is no one waiting to be invited, so
org onboarding, per-tenant quotas, usage metering and privacy pages would be built
against a hypothetical customer. They are out.

What replaces them is the question a single operator actually asks: *can I queue work
tonight and trust the output tomorrow, and can I tell why a run failed without reading
source code?*

Phase 2 is therefore two things, in this order:

- **A. Reliability** — the tool stops losing runs and stops breaking silently.
- **B. Throughput and lead quality** — the tool produces more and better pitches per
  hour of the user's time.

A comes first because B multiplies scraper surface, and without A a failure in B is
invisible.

---

## 2. Goals

**A. Reliability**

1. A regression cannot reach `main` without the test suites, lint and type checks
   passing.
2. A failed run explains itself in one log line, with the job id, without reading code.
3. A job survives an API restart. Queued work resumes; in-flight work is re-queued and
   retried rather than marked failed.
4. No HTTP request path can read another tenant's rows. The RLS policy has no
   settable bypass.

**B. Throughput and lead quality**

5. A batch of niches × cities can be queued in one action and runs unattended.
6. All three advertised sources work, and each has an offline parser test so a markup
   change is caught by CI, not by a silent empty result.
7. The pitch is chosen by a stated precedence — measured slow site first, absent
   website fourth — instead of a two-branch rule.
8. Every lead carries a ready-to-send email built only from measured facts, and the
   export is shaped for outreach: one row per business, best pitch first, with the
   evidence that justifies the pitch.
9. A source that is only partly working is still usable and is labelled as such,
   rather than hidden or silently returning nothing.

---

## 3. Non-goals

- Clerk organization onboarding, org-required-in-hosted-mode, invitations.
- Per-tenant quotas, rate limiting by plan, usage metering.
- Stripe checkout, portal, webhook lifecycle. Still Phase 3, still gated.
- Sentry or any external observability service. No account, no DSN, no data leaving
  the machine.
- Alembic migrations. `create_all` plus idempotent `ALTER` stays for now; the risk is
  recorded in §8.
- Browser-driven end-to-end tests in CI. Parser fixtures cover the brittleness that
  matters; Playwright e2e stays a manual pre-release check.
- Multi-instance deployment. The queue is written so a second instance would be safe,
  but nothing depends on one existing.

---

## 4. Anti-goals

These are the ways this phase fails even if every item ships:

- **A red pipeline that gets ignored.** If CI is flaky or slow, it will be bypassed
  within a week. Every gate must be deterministic and finish in a few minutes.
- **Logging nobody reads.** If a normal run emits forty lines, the one line that
  matters is lost. One line per stage transition, nothing per lead.
- **Getting the IP blocked.** A batch that fires 25 Google Maps scrapes concurrently
  will be rate-limited or blocked, which costs more than it gains.
- **Refactoring that breaks local mode.** Local operator mode is the only mode that
  works end to end today. It must still work after every step.

---

## 5. Constraints

- **Render free tier:** 512 MB RAM, spins down after inactivity. Chromium at more than
  one concurrent instance is a memory risk. Concurrency must be configurable and
  default low.
- **Windows for development, Linux for CI.** Paths, line endings and process
  termination differ. CI runs on `ubuntu-latest`.
- **SQLite must keep working.** It is the local database. Any Postgres-specific
  mechanism needs a SQLite equivalent or a documented skip.
- **No new paid services and no new heavyweight dependencies.** Python stdlib
  `logging` and `json` are enough for structured logs.
- **Next.js 16, React 19.** `proxy.ts`, not `middleware.ts`. `npm run lint:design`
  forbids arbitrary Tailwind values.
- **The repo lives under OneDrive** and has lost tracked files before. Work should
  stay small and committed often.

---

## 6. Approaches considered

### 6.1 What to build

| Option | What it is | Why it was dropped or kept |
|---|---|---|
| Harden only | CI, logging, queue, RLS | Kept as **A**. Pure insurance, no new leads. |
| Throughput only | Batches, sources, signals, export | Kept as **B**, but only after A. |
| Pitch tracking in-product | contacted/won/lost, notes, follow-ups | Dropped. It is a CRM. A spreadsheet and an inbox handle it until hundreds of leads exist. Revisit when tracking is genuinely lost. |
| Full multi-tenant SaaS | the original roadmap Phase 2 | Dropped. No customers exist; the acceptance criterion is unmeasurable. |

**Chosen:** A, then B.

### 6.2 Queue durability

| Option | Trade-off |
|---|---|
| Keep `asyncio.create_task` + mark stale jobs failed on boot | Simplest. Loses queued work on every restart, and a batch of 25 makes that expensive. |
| Redis + Celery/RQ | Real durability, but a new service, a new deployment target, and a second failure mode for a single-operator tool. |
| **DB-backed queue with leases** | No new infrastructure. The row is the queue. Atomic claim, heartbeat, expiry, bounded retries. Works on SQLite and Postgres. Safe if a second instance ever appears. |

**Chosen:** DB-backed leases.

### 6.3 Closing the RLS bypass

| Option | Trade-off |
|---|---|
| Keep the `admin` sentinel, test around it | Tests prove a policy that has a documented back door. Any code path reaching `admin_session()` reads everything. |
| Dedicated `BYPASSRLS` role for maintenance | Correct, but needs a second connection string and a role provisioned on Render. More moving parts than the tool has users. |
| **Remove the sentinel; make recovery per-tenant** | No privileged path exists at all. Recovery only ever touches the tenant that is asking, which is the only tenant that exists in practice. |

**Chosen:** remove the sentinel, per-tenant recovery.

### 6.4 CI build mode

| Option | Trade-off |
|---|---|
| Build in Clerk mode in CI | Needs a valid publishable key in a repo secret; fails on forks and on a fresh clone. |
| **Build in local mode in CI** | No secrets. Clerk-mode builds are already exercised by the Vercel preview deploy on every pull request, which has the real keys. |

**Chosen:** local mode in CI; Clerk mode is proven by the Vercel preview.

---

## 7. Design

### 7.1 CI (`.github/workflows/ci.yml`)

Two jobs, both on `push` to `main` and on every `pull_request`, with a concurrency
group that cancels superseded runs.

**`backend`** — `ubuntu-latest`, Python 3.12, `pip install -r
services/api/requirements-dev.txt`, then `pytest services/api/tests -q`. The existing
suite is SQLite-backed and needs no services. Chromium is not installed in CI because
no test launches a browser; parser tests read saved fixtures.

**`frontend`** — `ubuntu-latest`, Node 20, `npm ci` in `apps/dashboard`, then in order:
`npm run lint:design`, `npm run lint`, `npx tsc --noEmit`, `npm test`,
`NEXT_PUBLIC_AUTH_MODE=local npm run build`.

Caching: `actions/setup-node` with `cache: npm` and `cache-dependency-path:
apps/dashboard/package-lock.json`; `actions/setup-python` with `cache: pip`.

A third job, `rls`, uses a `postgres:16` service container. Because the existing suite
hard-codes SQLite in `conftest.py`, this job runs pytest a second time with
`TEST_DATABASE_URL` pointing at the service container:

```bash
pytest services/api/tests -q -m "not postgres"   # the SQLite suite
TEST_DATABASE_URL=postgresql://... pytest services/api/tests -q -m postgres
```

`conftest.py` reads `TEST_DATABASE_URL` and uses it instead of the temp SQLite file
when it is set, then calls `init_db.init_db()` so the policies exist before the test
runs. Postgres-only tests carry `@pytest.mark.postgres` and are deselected by default.
It is part of the same workflow so a failure blocks the same way.

No secrets are required by any job.

**Branch protection is not code.** Making CI *required* before merge is a repository
setting, not a workflow file. Once the workflow is green on `main`, the user must
enable "Require status checks to pass" for `backend`, `frontend` and `rls` in GitHub →
Settings → Branches. Until then CI reports but does not block.

### 7.2 Structured logging (`services/api/src/logging_setup.py`)

Python stdlib only. A `JsonFormatter` emits one object per line to stdout:

```json
{"ts":"2026-11-07T11:20:03.114Z","level":"INFO","event":"job.finished","request_id":"...","job_id":"...","tenant_id":"local_operator","source":"gmaps","region":"GB","limit":10,"status":"succeeded","leads":10,"duplicates":8,"duration_ms":18422}
```

- `LOG_LEVEL` env var, default `INFO`.
- A request-id middleware generates a short id per request and adds it to a
  `contextvars` value so job logs inherit it.
- Job lifecycle emits exactly: `job.queued`, `job.claimed`, `job.started`,
  `job.finished`, `job.failed`, `job.requeued`, `job.cancelled`. Nothing per lead.
- Scraper stderr is logged once at `WARNING` on failure, summarised, never dumped
  whole.
- Local development keeps human-readable output by setting `LOG_FORMAT=text`; the
  default is JSON because that is what Render captures.

### 7.3 Durable queue with leases

New columns on `scrape_jobs` (all nullable/defaulted, added by the existing idempotent
`ALTER` block):

| Column | Purpose |
|---|---|
| `attempt` | `INTEGER NOT NULL DEFAULT 0`. Bounded retries. |
| `lease_expires_at` | `TIMESTAMP NULL`. When the current claim goes stale. |
| `worker_id` | `VARCHAR NULL`. Which process holds the lease. |
| `batch_id` | `VARCHAR(36) NULL`, indexed. Groups a batch. |

Claim is one atomic statement guarded by the status, so two claimers cannot both win:

```sql
UPDATE scrape_jobs
   SET status = 'running',
       worker_id = :worker_id,
       lease_expires_at = :lease_until,
       attempt = attempt + 1,
       started_at = COALESCE(started_at, :now)
 WHERE id = :job_id
   AND status = 'queued'
   AND cancel_requested = false
RETURNING tenant_id, query, region, source, limit, attempt;
```

SQLite has `UPDATE ... RETURNING` from 3.35, which the local runtime satisfies. The
row count is checked either way.

- **Heartbeat:** while the worker runs, a separate `asyncio` task updates
  `lease_expires_at` every 15 s (lease 60 s) and is cancelled when the scrape returns.
  It must be its own task because `run_worker_async` awaits the subprocess and never
  yields control to a loop that would otherwise touch the database. A crashed process
  stops heartbeating and its lease expires.
- **Column creation:** the new columns are added by a `JOB_COLUMNS` block in
  `init_db.py`, mirroring the existing `LEAD_COLUMNS` loop. The models also carry them
  so fresh databases are created correctly.
- **Recovery, per tenant:** `recover_jobs(tenant_id)` finds that tenant's rows where
  `status = 'running' AND lease_expires_at < now` and either re-queues them
  (`attempt < 3`, status back to `queued`, lease cleared) or marks them `failed` with
  "Gave up after 3 attempts". It also releases any `queued` row whose
  `cancel_requested` is true.
- **When recovery runs:** at startup for the configured local tenant, and on every
  authenticated `GET /api/jobs` for the requesting tenant. That is enough because a
  tenant only ever resumes its own work, and the local operator is the only tenant.
- **`mark_stale_jobs_failed` is deleted.** Its behaviour — losing queued work on
  restart — is exactly the problem this phase exists to fix.
- **Concurrency:** an `asyncio.Semaphore(SCRAPE_CONCURRENCY)` (default `1` on the free
  tier, `2` locally) bounds simultaneous Chromium instances. A queued job waits rather
  than being dropped.
- **Cancellation** is unchanged in mechanism: `cancel_requested` plus terminating the
  in-memory process. A cancelled job that is later claimed is marked `cancelled`
  instead of run.

### 7.4 Removing the RLS bypass

- The policy becomes `USING (tenant_id = current_setting('app.current_tenant', true))`.
  The `OR ... = 'admin'` branch is deleted. `FORCE ROW LEVEL SECURITY` stays.
- `admin_session()` is deleted from `db.py`.
- Every function in `jobs.py` takes `tenant_id` explicitly and uses
  `tenant_session(tenant_id)`. `start_job(job_id, tenant_id)` threads it to
  `execute_job`.
- The existing manual `job.tenant_id != tenant_id` checks stay. They are what protects
  SQLite, and they are free defence in depth on Postgres.
- `_save_leads` already uses `tenant_session`. No change.
- **New Postgres-only test** (`tests/test_rls.py`, skipped when the URL is SQLite):
  create two tenants' rows, open a session as tenant A, assert tenant B's rows are
  invisible through the ORM; attempt a direct `SELECT` for B's id and assert zero rows.
  This is the test that makes "multi-tenant" true rather than aspirational.

### 7.5 Batches

- `POST /api/batches` accepts `{items: [{query, region, source, limit}, ...]}`, max 25.
  Validation reuses the existing per-field rules. Returns the created jobs and a
  `batch_id`.
- `GET /api/jobs?batch_id=...` filters. No new table; `batch_id` on the job is enough.
- Jobs in a batch are created `queued` and claimed by the same worker loop, so
  concurrency limits apply across the whole batch.
- **Dashboard:** a "Batch" panel on `/dashboard` where the user pastes one query per
  line and ticks regions. Shows a compact progress list (queued/running/done per row)
  and a batch-level total. Reuses the existing job polling; no new state machine.

### 7.6 Sources and parser fixtures

- Verify `duckduckgo-places` and `yellowpages-intl` actually return results today. Fix
  what is fixable. A source that stays broken is **kept and labelled**, not removed: it
  is still selectable, but its option text carries a short "known issues" note and the
  dashboard warns before a run uses it. Partial results from a flaky source are worth
  more than a hidden one, provided the user is not misled about what they got.
- Source metadata gains `degraded: bool` and `note: str` so the label lives in one
  place (`config.SOURCE_INFO`) and the UI reads it rather than hard-coding copy.
- `tests/fixtures/<source>/<case>.html` plus `tests/test_parsers.py`. Parsers are
  extracted from `scraper_worker.py` into importable functions so they can be tested
  without a browser or a network call. This is the change that turns "the directory
  changed its markup" from a silent empty result into a red CI run.

### 7.7 Pitch precedence

Replace the two-branch rule with an explicit ordered table, first match wins. The order
is by *evidence strength and proven willingness to buy*, not by size of the gap: a
business with a live site has already paid someone for web work, and a measured number
is harder to argue with than an absence.

| Rank | Condition | Pitch |
|---|---|---|
| 1 | `mobile_load_ms > 3000` | "Your site takes X.Xs to load on a phone. Most visitors leave before three." |
| 2 | Website is `http://` only, no TLS | "Your site has no HTTPS. Chrome marks it 'Not secure' before anyone reads it." |
| 3 | Has a website, no chat widget | "Nobody answers the site after hours. A small bot would." |
| 4 | No website at all | "There is no site to find — just a directory listing." |
| 5 | Otherwise | "The site is in decent shape — lead with SEO or content." |

No-website sits at 4 rather than 1 deliberately. The gap is the largest, but there is
no artifact to audit, the pitch has no evidence behind it, and the owner has not shown
they spend on web. Ranks 1–3 are where the money is.

`pitch_rank` (1–5) is stored on the lead so the UI and exports can sort by it without
recomputing. Ranks 1–3 are derivable from data already collected, so no extra requests
are needed.

### 7.8 Export shaped for outreach

One CSV row per business, sorted by `pitch_rank` then `mobile_load_ms` descending:

`business_name, phone, email, website, pitch, evidence, email_subject, email_body, region, query, found_at`

`evidence` is a short human string built from the measured facts
("4.2s mobile load · no chat widget · no HTTPS"). JSON keeps the same fields plus the
raw booleans. The existing export filenames, quoting behaviour and the `downloadFile`
helper stay.

### 7.9 A sendable email per lead

The deliverable is not a hook to write from; it is an email the user can copy and send.
That is one more step than a label, and it is where the actual income is.

- **New module `services/api/src/pitch.py`**, pure functions, no network, no model
  call. Deterministic output: the same lead and settings always produce the same email.
  This is deliberate — a generated email that invents a detail about a business is worse
  than no email, and a paid API call per lead is not part of this tool's cost model.
- **`build_email(lead, settings) -> {subject, body}`** selects a template by
  `pitch_rank` and fills only slots that come from measured data: business name, the
  load time in seconds, the domain, the missing signal. Nothing is inferred.
- **Tone rules, enforced by tests:** under 120 words; one observation; one question;
  no superlatives; no fake familiarity ("I loved your site"); no claim that was not
  measured. Every body ends with a one-line opt-out ("If this is not relevant, tell me
  and I will not follow up.") because this is unsolicited B2B mail and a clean exit
  reduces complaints.
- **Signature** comes from `WorkspaceSettings`, which gains `sender_name`,
  `sender_email` and `sender_phone` (all nullable). With them empty the body still
  reads correctly and the settings page prompts for them; it never prints a placeholder
  like `{your name}`.
- **Computed at serialization time**, not stored. `_serialize_lead` returns
  `email_subject` and `email_body`, so existing leads, old jobs and every export get the
  feature without a backfill or a schema change. The cost is recomputing a short string
  per lead per request, which is negligible at these volumes.
- **Dashboard:** a "Copy email" action per lead that copies subject and body to the
  clipboard, plus a preview dialog so the user can read it before sending. No "copy all"
  action — bulk sending from this tool would be exactly the behaviour that gets a domain
  flagged.
- **Tests:** `tests/test_pitch.py` asserts each rank produces its own template, that no
  unresolved braces survive, that the word limit holds, and that a missing signature
  degrades without printing a placeholder.

---

## 8. Risks and open records

- **`create_all` + `ALTER` is not a migration system.** It cannot express a rename, a
  type change or a backfill, and it will silently diverge between environments. It is
  acceptable while there is one database and one operator. It becomes unacceptable the
  moment a second environment holds data worth keeping. Recorded, not fixed.
- **The `maintenance` removal assumes the process is trusted.** Removing the sentinel
  means there is no privileged path left, which is stronger than before. There is no
  dynamic SQL with user input today, so the remaining injection surface is the ORM.
- **A batch of 25 can still get the IP throttled.** The concurrency default and the
  per-run delay in the worker are the only controls. If throttling appears, lower
  concurrency rather than adding proxies.
- **Retries re-run the whole scrape.** A subprocess cannot be resumed, so a re-queued
  job starts over. Dedupe makes that safe but not free.

---

## 9. Done when

1. A pull request with a deliberately failing test cannot merge: CI is red and required.
2. A failed run produces one JSON line naming the job, the stage and the reason.
3. Killing the API mid-batch leaves the queued jobs queued; restarting resumes them.
4. `test_rls.py` proves tenant A cannot read tenant B on Postgres.
5. `pytest` passes on SQLite and on Postgres; `npm run lint:design`, `npm run lint`,
   `tsc --noEmit`, `npm test` and `npm run build` all pass.
6. The dashboard can queue a 10-item batch and show per-item progress to completion.
7. Each enabled source has at least one parser fixture test, and a degraded source is
   labelled in the UI before it is used.
8. A lead with a slow site sorts above a lead with no website in both UI and CSV.
9. Every lead row yields a copyable email that names only measured facts, and the CSV
   contains `email_subject` and `email_body`.
10. Local operator mode still works end to end, verified at 390px and 1440px.

---

## 10. Left to the builder

- Exact heartbeat and lease durations if 15 s / 60 s proves wrong under a real
  scrape.
- Whether the batch panel is a separate route or a section of `/dashboard`. Either is
  acceptable; a section is less navigation.
- Whether the parser extraction is a module move or a thin wrapper. A move is cleaner;
  a wrapper is safer for the existing subprocess entry point.
- The exact wording of the five email templates. The structure and constraints are
  fixed; the sentences are the builder's.
- Whether the degraded-source warning is inline next to the select or a confirmation
  before the run starts. Inline is less friction and is the safer default.
- CI matrix breadth (one Python version or several). One is enough.
