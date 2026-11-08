# Phase 2 — Antigravity IDE Prompt Set

**For:** Gemini Antigravity IDE, executing
`docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md`
**Branch:** `feat/phase-2-reliability-throughput` (created by Prompt 0)
**Spec:** `docs/superpowers/specs/2026-11-07-phase-2-reliability-and-throughput-design.md`

## How to use this file

1. Open the repo in Antigravity. Make sure the working tree is clean
   (`git status`) — if it is not, stop and commit or stash first.
2. Paste **Prompt 0** alone. Wait for it to report the baseline is green.
3. Then paste **one task prompt per message**, in order. Do not paste two at once.
4. After each prompt, read the five-line report it gives you before pasting the next.
5. If a prompt reports a blocker, fix the blocker or re-paste the same prompt. Never
   tell it to "just continue".

Why one prompt per task: each task is a TDD cycle with a commit. Batching them makes
the agent skip the red-test step, which is the only thing that keeps the plan honest.

---

## Prompt 0 — Setup

````text
You are the implementer for Phase 2 of Insight Scraper: a FastAPI backend in
services/api and a Next.js 16 dashboard in apps/dashboard. You are working in the
repository that is currently open. Do not start any implementation yet — this message
only sets up the run.

READ FIRST, IN THIS ORDER
1. AGENTS.md at the repo root. Its design-authority table is binding: no arbitrary
   Tailwind values, no gradients except the hero heading text gradient, lucide-react
   is the approved icon set, and do not apply frontend-design or impeccable guidance.
2. docs/superpowers/specs/2026-11-07-phase-2-reliability-and-throughput-design.md —
   read it in full. It is the authority on WHAT to build.
3. docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md — read it
   in full. It is the authority on HOW: exact files, signatures, test names,
   verification commands and commit messages.

CREATE THE TASK ARTIFACT
4. Use write_to_file with IsArtifact: true and ArtifactType: "task", named
   "Phase 2 Progress". It contains exactly these lines and nothing else:

   - [ ] Task 1 — CI workflow
   - [ ] Task 2 — Structured logging
   - [ ] Task 3 — Lease-based queue
   - [ ] Task 4 — Remove the RLS bypass
   - [ ] Task 5 — Batch runs
   - [ ] Task 6 — Parser fixtures and source labelling
   - [ ] Task 7 — Signals and pitch precedence
   - [ ] Task 8 — Sendable email per lead
   - [ ] Task 9 — Outreach export and copy action
   - [ ] Final verification

   Keep this artifact updated as you go. It is the only progress record.

BRANCH
5. Run:
   git status
   git checkout main
   git pull --ff-only
   git checkout -b feat/phase-2-reliability-throughput
   If git pull fails, stop and tell me — do not merge or rebase anything yourself.

BASELINE
6. Prove the starting point is green before you change a single file.
   Backend, from the repo root:
     .venv\Scripts\python.exe -m pytest services/api/tests -q
   Frontend, from apps/dashboard:
     npm test
     npm run lint:design
     npm run lint
     npx tsc --noEmit
   Record the exact pass counts. If anything fails, stop and report the failure. Do
   not fix unrelated tests, do not skip them, do not delete them.

RULES FOR THE WHOLE PHASE
- One task per message from me. Never begin the next task on your own initiative.
- Every task is TDD and the order is not negotiable: write the tests, run them, show
  me the failing output, implement, run them again, show the passing output, then run
  the full suites.
- Never weaken or delete a test to make a suite pass. If you believe a test in the
  plan is wrong, stop and explain why instead of changing it.
- Local operator mode must keep working after every task. Its configuration is:
  DATABASE_URL=sqlite:///... , DEV_BYPASS_AUTH=true, DEV_TENANT_ID=local_operator,
  ALLOWED_ORIGINS=http://localhost:3000 for the API; NEXT_PUBLIC_AUTH_MODE=local and
  NEXT_PUBLIC_API_URL=http://localhost:8000 for the dashboard.
- No new paid services, no external observability, no LLM API calls, no Alembic, no
  Redis. Python standard library only for logging and JSON.
- Commit at the end of each task with exactly the message given in the plan. Never
  git push during Tasks 1-9 except where the task prompt explicitly tells you to.
  Never git clean. Never delete untracked files — this repo lives under OneDrive and
  has lost tracked files before.
- If a command needs a network or a browser and cannot run, say so. Do not fake
  output and do not silently skip the check.

REPORT BACK
Reply with exactly: the branch name, the backend pass count, the frontend pass count,
and either "baseline green" or the first failure you hit. Nothing else.
````

---

## Prompt 1 — CI workflow

````text
Execute Task 1 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 1: CI workflow"). Read that section again before you start; follow its steps in
order.

Scope: create .github/workflows/ci.yml with exactly two jobs, `backend` and `frontend`,
and create services/api/pytest.ini. Do NOT add the `rls` job — it arrives in Task 4,
because until Postgres tests exist `pytest -m postgres` collects nothing and exits 5,
which would leave the branch permanently red.

Details that matter:
- `backend` runs `pytest services/api/tests -q -m "not postgres"`. The marker must be
  registered in pytest.ini or pytest emits a warning on every run.
- `frontend` runs `npm ci` with `working-directory: apps/dashboard`; the repository
  does have apps/dashboard/package-lock.json, so `npm ci` is correct and `npm install`
  is not.
- `actions/setup-node` needs both `cache: npm` and
  `cache-dependency-path: apps/dashboard/package-lock.json`, because the lockfile is
  not at the repository root.
- `actions/setup-python` needs `cache: pip` and
  `cache-dependency-path: services/api/requirements-dev.txt`.
- The frontend build step sets `NEXT_PUBLIC_AUTH_MODE: local`. No job may reference a
  secret.
- `concurrency: group: ci-${{ github.ref }}` with `cancel-in-progress: true` on the
  workflow.
- Triggers: push to main, and every pull_request.

Verification, in this order:
1. Validate the YAML. If PyYAML is importable, run
   python -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'));print('ok')".
   If it is not importable, skip this step — do not install a dependency for it.
2. Run every command the workflow runs, locally, in the order the workflow runs them.
   They must all pass, because the suite is green today. If one fails, change the
   workflow to match reality — never the other way round.
3. Confirm pytest.ini produces no "unknown mark" warning:
   .venv\Scripts\python.exe -m pytest services/api/tests -q -m "not postgres"

Then commit with exactly:
  git add .github/workflows/ci.yml services/api/pytest.ini
  git commit -m "ci: add backend and frontend gates"

Then push this branch so the workflow actually runs once:
  git push -u origin feat/phase-2-reliability-throughput
If the push asks for credentials or fails, stop and tell me. Do not force-push, do not
change the remote.

Tick Task 1 in the Phase 2 Progress artifact. Do not start Task 2.

Report in five lines or fewer: files added, the local test count, whether the YAML
validated, whether the push succeeded, and anything you had to decide differently.
````

---

## Prompt 2 — Structured logging

````text
Execute Task 2 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 2: Structured logging"). Read the task and spec section 7.2 again before you
start.

Scope: create services/api/src/logging_setup.py, create
services/api/tests/test_logging.py, and wire logging into main.py and jobs.py.

Write the four tests from the plan first, run them, and show me the failure before you
write any implementation. The expected failure is
ModuleNotFoundError: No module named 'logging_setup'.

Details that matter:
- `configure_logging(level=None, fmt=None, stream=None)`. The extra `stream` parameter
  exists so the tests can pass an io.StringIO and parse the output line by line
  without touching the root logger. Use it.
- `JsonFormatter` emits one JSON object per line with keys `ts` (ISO-8601 UTC,
  millisecond precision), `level`, `event`, plus every field passed to `log_event`.
  Extra fields go in a single dict attribute on the LogRecord, not as ad-hoc
  attributes, so two records cannot collide.
- `log_event(event, level=logging.INFO, **fields)` attaches the current request id
  from a `contextvars.ContextVar`. A record with no request context must simply omit
  the key rather than emit null.
- `configure_logging` must be idempotent: calling it twice must not double every line
  through two handlers. Remove existing handlers it installed before adding new ones.
- `LOG_LEVEL` default INFO. `LOG_FORMAT` default `json`; `text` is human-readable and
  must not contain braces.
- In main.py, call `configure_logging()` inside `lifespan` before anything else, and
  add one HTTP middleware that generates a short request id, sets it on the
  contextvar, resets it afterwards in a `finally`, and logs exactly one
  `request.finished` event with method, path, status_code and duration_ms.
- In jobs.py, emit exactly these events and nothing else: job.queued, job.claimed,
  job.started, job.finished, job.failed, job.requeued, job.cancelled. Each carries
  job_id and tenant_id. Nothing per lead. Scraper stderr is logged once at WARNING on
  failure, summarised — never dumped whole.
- Do not change behaviour in this task. It is logging only.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests/test_logging.py -q
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test

Commit with exactly:
  git add services/api/src/logging_setup.py services/api/src/main.py services/api/src/jobs.py services/api/tests/test_logging.py
  git commit -m "feat(api): structured JSON logs with request and job ids"

Tick Task 2 in the artifact. Do not start Task 3.

Report in five lines or fewer: the new test count, the full suite count, one example
JSON log line, and anything you had to decide differently.
````

---

## Prompt 3 — Lease-based queue

````text
Execute Task 3 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 3: Lease-based queue"). Read the task and spec section 7.3 again before you
start. This is the largest backend change in the phase; do it in the plan's step order.

Scope: add four columns to ScrapeJob, implement claim_job / heartbeat / recover_jobs in
jobs.py, delete mark_stale_jobs_failed, and rework execute_job and start_job.

Write the eight tests from the plan first and show me them failing with
ImportError: cannot import name 'claim_job'.

Signatures — use these exactly, including tenant_id as the first argument:
  claim_job(tenant_id, job_id, worker_id, lease_seconds) -> dict | None
  heartbeat(tenant_id, job_id, worker_id, lease_seconds) -> bool
  recover_jobs(tenant_id, max_attempts=3) -> dict[str, int]
  execute_job(job_id, tenant_id) -> None
  start_job(job_id, tenant_id) -> None
tenant_id is a parameter now because Task 4 deletes admin_session and RLS cannot touch
a row without a tenant context. Do not leave it out and fix it later.

Details that matter:
- The claim is ONE guarded statement:
    UPDATE scrape_jobs SET status='running', worker_id=:w, lease_expires_at=:until,
           attempt=attempt+1, started_at=COALESCE(started_at,:now)
     WHERE id=:id AND status='queued' AND cancel_requested=false
  RETURNING tenant_id, query, region, source, limit, attempt
  Commit it — tenant_session commits on exit, so do the claim inside it and do not
  keep the session open across the scrape.
- If the claim matches nothing, run one further guarded update: WHERE id=:id AND
  status='queued' AND cancel_requested=true, setting status='cancelled',
  finished_at=now, error='Cancelled before it started.'. That is what makes
  test_claim_skips_a_cancelled_queued_job pass without launching a browser.
- Check `sqlite3.sqlite_version`. UPDATE ... RETURNING needs 3.35 or newer. If the
  local interpreter is older, fall back to a guarded UPDATE plus rowcount check inside
  the same transaction, and tell me which path you used.
- The heartbeat must be its own asyncio task, created with asyncio.create_task and
  cancelled in a finally block. It must open its own short tenant_session per tick —
  never hold a session across run_worker_async. `run_worker_async` awaits a subprocess
  and never yields to a coroutine that would touch the database, so an inline
  heartbeat would never fire.
- The concurrency semaphore must be created once at module scope:
  _SEM = asyncio.Semaphore(int(os.getenv("SCRAPE_CONCURRENCY", "1"))). Creating it per
  call bounds nothing.
- recover_jobs runs inside tenant_session(tenant_id) and handles three cases: expired
  lease with attempt < max_attempts -> back to 'queued' with the lease cleared;
  expired with attempt >= max_attempts -> 'failed' with "Gave up after N attempts";
  cancel_requested on a queued row -> 'cancelled'. It must be idempotent: a second
  call changes nothing.
- Delete mark_stale_jobs_failed entirely and remove its call from main.py's lifespan,
  replacing it with recover_jobs(config.dev_tenant_id()).
- Call recover_jobs(tenant_id) at the top of GET /api/jobs for the requesting tenant.
- init_db.py: add a JOB_COLUMNS tuple mirroring the existing LEAD_COLUMNS and apply it
  in the same ALTER loop. Note that on SQLite init_db returns before that loop, so an
  old local .db file will not gain the columns — if local mode fails with "no such
  column", delete the local SQLite file rather than adding a migration.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test
Existing test_jobs.py asserts on mark_stale_jobs_failed. Replace that assertion with
one on recover_jobs; do not delete the test.

Commit with exactly:
  git add services/api/src/models.py services/api/src/init_db.py services/api/src/jobs.py services/api/src/main.py services/api/tests/test_queue.py services/api/tests/test_jobs.py
  git commit -m "feat(api): lease-based job queue that survives a restart"

Tick Task 3 in the artifact. Do not start Task 4.

Report in five lines or fewer: new test count, full suite count, which RETURNING path
you used, and anything you had to decide differently.
````

---

## Prompt 4 — Remove the RLS bypass

````text
Execute Task 4 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 4: Remove the RLS bypass"). Read the task and spec section 7.4 again before you
start.

Scope: delete admin_session from db.py, remove the `OR ... = 'admin'` branch from every
RLS policy in init_db.py, convert every admin_session() call in jobs.py to
tenant_session(tenant_id), create services/api/tests/test_rls.py, teach conftest.py
about TEST_DATABASE_URL, and add the `rls` CI job.

Write the tests first and show me them failing. Expected: the source-grep test fails
because "admin_session" is still present, and the Postgres tests skip.

Details that matter:
- The policy becomes exactly:
    USING (tenant_id = current_setting('app.current_tenant', true))
  Keep FORCE ROW LEVEL SECURITY. Delete the comment that justified the admin sentinel.
- `_set_tenant` in db.py stays as it is — only admin_session is deleted.
- Keep the explicit `job.tenant_id != tenant_id` guards in get_job, delete_job,
  leads_for_job and request_cancel. They are what protects SQLite, and free defence in
  depth on Postgres.
- test_jobs_module_does_not_reference_admin_session reads services/api/src/jobs.py as
  text and asserts the string "admin_session" does not appear. It must run on SQLite.
- conftest.py: when TEST_DATABASE_URL is set, use it instead of the temp SQLite file,
  call init_db.init_db() so policies exist, and let @pytest.mark.postgres tests run.
  Otherwise add a pytest_collection_modifyitems hook that skips them. Leave
  _apply_test_env() hermetic exactly as it is for the default path — every existing
  test depends on it.
- Add the `rls` job to .github/workflows/ci.yml in this task, not earlier: before now
  `pytest -m postgres` collects nothing and exits 5, which reads as a failure. Use
  services: postgres:16 with POSTGRES_PASSWORD=postgres, POSTGRES_DB=foundry_test, a
  pg_isready health check, env TEST_DATABASE_URL, and
  `pytest services/api/tests -q -m postgres`.

Verification:
1. .venv\Scripts\python.exe -m pytest services/api/tests -q
   Expected: everything passes, the Postgres tests report as skipped.
2. Postgres run. Docker Desktop must be running. Start it if you can; if you cannot,
   say so and leave the tests skipped — do not delete them and do not mark them
   xfail. With Docker running:
     docker run -d --name insight-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=foundry_test -p 5432:5432 postgres:16
     .venv\Scripts\python.exe -m pytest services/api/tests -q -m postgres
   with TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foundry_test
   set. Expected: the Postgres tests pass, including tenant A seeing zero of tenant B's
   rows by ORM query and by raw SELECT.
   Clean up the container afterwards with: docker rm -f insight-pg
3. cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test

Commit with exactly:
  git add .github/workflows/ci.yml services/api/src/db.py services/api/src/init_db.py services/api/src/jobs.py services/api/src/main.py services/api/tests/test_rls.py services/api/tests/conftest.py
  git commit -m "fix(api): remove the RLS admin bypass and scope every job query to its tenant"

Then push, because this is the commit that makes the new CI job meaningful:
  git push
If it fails, stop and tell me.

Tick Task 4 in the artifact. Do not start Task 5.

Report in five lines or fewer: full suite count, Postgres test result (pass, or
"skipped because Docker unavailable"), whether the push succeeded, and anything you had
to decide differently.
````

---

## Prompt 5 — Batch runs

````text
Execute Task 5 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 5: Batch runs"). Read the task and spec section 7.5 again before you start.

Scope: add POST /api/batches, a batch_id filter on GET /api/jobs, create_batch in
jobs.py, and a BatchPanel section on /dashboard.

Write the four tests from the plan first and show them failing with a 404 on
/api/batches.

Details that matter:
- Request body: {"items": [{"query": str, "region": str, "source": str, "limit": int}, ...]}.
  Maximum 25 items. Reuse the existing MIN_QUERY_LENGTH, MAX_QUERY_LENGTH,
  MAX_LEAD_LIMIT and the existing Region/Source enums — do not redeclare them.
- Validate the entire list before creating anything. One invalid item rejects the whole
  request with 422 and creates zero jobs. A half-created batch is worse than a rejected
  one; the test test_batch_rejects_the_whole_request_on_one_invalid_item exists to
  prove it.
- create_batch(tenant_id, items) generates one uuid4 batch_id, creates every job with
  it, and starts them. Return (batch_id, jobs).
- GET /api/jobs gains an optional batch_id query parameter, filtered in SQL, not in
  Python.
- Dashboard: BatchPanel.tsx mounted as a section of /dashboard behind a "Batch" tab,
  not a new route. A textarea for one query per line plus region checkboxes; on submit
  post the cartesian product of lines times checked regions, and if that product
  exceeds 25, show the count and refuse before sending. Render per-item status from
  the existing job polling against /api/jobs?batch_id=... — do not add a second polling
  mechanism.
- Styling: existing tokens only. npm run lint:design forbids arbitrary Tailwind values
  and it is part of the gate. lucide-react for any icon.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test

Commit with exactly:
  git add services/api/src/main.py services/api/src/jobs.py services/api/tests/test_batches.py apps/dashboard/src/components/BatchPanel.tsx apps/dashboard/src/app/dashboard/page.tsx apps/dashboard/src/lib/jobs.ts
  git commit -m "feat: batch scrapes across niches and regions"

Tick Task 5 in the artifact. Do not start Task 6.

Report in five lines or fewer: new test count, full suite count, whether lint:design
passed, and anything you had to decide differently.
````

---

## Prompt 6 — Parser fixtures and source labelling

````text
Execute Task 6 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 6: Parser fixtures and source labelling"). Read the task and spec section 7.6
again before you start.

This is the only task that needs the network and a real browser. Read this whole
message before running anything.

Scope: extract the parsing bodies out of scraper_worker.py into a new
services/api/src/parsers.py, capture one real HTML page per source as a fixture, write
services/api/tests/test_parsers.py, add SOURCE_INFO to config.py with label/degraded/note,
expose GET /api/sources, and have the dashboard read source labels from the API.

Step 1 — capture the fixtures. This must be real HTML, not HTML you wrote yourself. A
hand-written fixture proves nothing about whether the parser still matches the site.
Run the worker once per source and save the raw HTML under
services/api/tests/fixtures/<source>/. If Playwright's browser is missing, install it
with: .venv\Scripts\python.exe -m playwright install chromium
If a source returns nothing, save whatever it actually returned, record that in its
note, and set degraded=True for it. Do NOT invent a fixture and do NOT delete the
source.

Step 2 — write the five tests from the plan, including
test_a_broken_fixture_returns_an_empty_list_not_an_exception (feed the parser garbage
HTML and assert [] rather than a raise) and test_source_info_marks_a_degraded_source.
Run them and show me the failure: no module named 'parsers'.

Step 3 — implement. The parser functions return dicts with exactly the keys _save_leads
already reads: "Business Name", "Website", "Phone", "Email", "Socials",
"Has_Chatbot_Widget", "Mobile_Load_Ms", "Pitch_Hook", "Region". Keep scraper_worker.py's
subprocess entry point and CLI behaviour unchanged — it is launched as a subprocess by
scraper_runner.py and its stdout contract must not move.

Step 4 — config.SOURCE_INFO becomes the single source of truth:
  SOURCE_INFO = {"gmaps": {"label": ..., "degraded": False, "note": ""}, ...}
GET /api/sources returns it. apps/dashboard/src/lib/jobs.ts stops hard-coding labels and
reads them from that endpoint, falling back to the current labels if the request fails.

Step 5 — the UI. A degraded source stays selectable; its note appears beneath the
option text or immediately under the select. The run button is never blocked. No new
arbitrary Tailwind values.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test

Commit with exactly:
  git add services/api/src/parsers.py services/api/src/scraper_worker.py services/api/src/config.py services/api/src/main.py services/api/tests/fixtures services/api/tests/test_parsers.py apps/dashboard/src/lib/jobs.ts apps/dashboard/src/app/dashboard/page.tsx
  git commit -m "feat: offline parser fixtures and labelled degraded sources"

Tick Task 6 in the artifact. Do not start Task 7.

Report in five lines or fewer: which sources produced a real fixture, which are marked
degraded and why, new test count, full suite count, and anything you had to decide
differently.
````

---

## Prompt 7 — Signals and pitch precedence

````text
Execute Task 7 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 7: Signals and pitch precedence"). Read the task and spec section 7.7 again
before you start. The ordering in that table is a product decision, not a guess — do
not reorder it.

Scope: pitch_rank_for(website, mobile_load_ms, has_chatbot) -> (rank, pitch),
Lead.pitch_rank column, wiring in scraper_worker.py, and rank ordering in the dashboard.

Write the parametrised test first and show it failing. The five cases and their
expected ranks, first match wins:
  1  mobile_load_ms > 3000
  2  website is http:// only (no TLS)
  3  has a website and no chat widget
  4  no website at all
  5  otherwise
A lead with no website is rank 4, deliberately — it is not rank 1. The test
test_no_website_is_not_rank_one exists to stop that regressing.

Details that matter:
- Put pitch_rank_for in parsers.py alongside the parsers, or a new signals.py. One
  ordered function, no chain of if/elif scattered across files.
- scraper_worker.py calls it instead of its current two-branch rule. The pitch text it
  writes into Pitch_Hook must come from the same function, so the stored hook and the
  stored rank can never disagree.
- Lead.pitch_rank is an Integer column, nullable. Add it to the model AND to the ALTER
  handling in init_db.py. Existing rows will be NULL, which is expected — no backfill.
- _save_leads writes pitch_rank from the scraped dict.
- Dashboard: lib/leads.ts gains pitchRank and a sortByPitch helper; LeadResults renders
  in rank order with NULL last, and the compact label map gains a fifth entry. Do not
  recompute the rank in TypeScript — read it from the API.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm test ; npm run lint:design ; npm run lint ; npx tsc --noEmit

Commit with exactly:
  git add services/api/src/parsers.py services/api/src/scraper_worker.py services/api/src/models.py services/api/src/init_db.py services/api/src/jobs.py services/api/tests/test_pitch_rank.py apps/dashboard/src/lib/leads.ts apps/dashboard/src/components/LeadResults.tsx
  git commit -m "feat: evidence-ranked pitch precedence"

Tick Task 7 in the artifact. Do not start Task 8.

Report in five lines or fewer: new test count, full suite count, how many existing
leads now have a NULL rank (or "no existing data"), and anything you had to decide
differently.
````

---

## Prompt 8 — Sendable email per lead

````text
Execute Task 8 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 8: Sendable email per lead"). Read the task and spec section 7.9 again before
you start. The email is the point of the phase: it must be copyable and sendable
without editing.

Scope: create services/api/src/pitch.py, add sender_name / sender_email / sender_phone
to WorkspaceSettings, expose them on GET/PUT /api/settings, attach email_subject and
email_body in _serialize_lead, and add the three inputs to the settings page.

Write the six tests from the plan first and show them failing with no module named
'pitch'.

Non-negotiable rules for the generated email:
- Deterministic. Same lead plus same settings always produces the same bytes. No
  network, no model call, no randomness, no timestamps in the body.
- Built only from measured facts: business name, the load time in seconds, the domain,
  the missing signal. Never infer anything the scraper did not measure. A confident
  invented detail is worse than no email.
- Under 120 words. One observation. One question. No superlatives. No fake familiarity
  such as "I loved your site".
- The final line is the opt-out, always: "If this is not relevant, tell me and I will
  not follow up."
- Five templates keyed by pitch_rank, one per rank, each with its own subject line.
- Signature assembled from sender_name / sender_email / sender_phone. Each is omitted
  when empty, and the whole block is omitted when all three are empty. The body must
  still read as a complete message. Never print "None", never print {your_name}, never
  leave a dangling comma or an empty line where the signature would be.
- If pitch_rank is NULL (a lead saved before Task 7), fall back to the rank-5 template
  rather than raising.

Details that matter:
- _serialize_lead loads the tenant's WorkspaceSettings once per request, not once per
  lead. Restructure the call sites so the settings object is passed in.
- WorkspaceSettings columns are nullable; add them to the model and to the ALTER
  handling in init_db.py.
- Settings page: three inputs using the existing form pattern on
  apps/dashboard/src/app/dashboard/settings/page.tsx, with a short helper line saying
  they are used to sign generated emails.

Verification:
  .venv\Scripts\python.exe -m pytest services/api/tests -q
  cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test

Then print, for one realistic lead per rank, the subject and body your code produces,
so I can read all five before Task 9.

Commit with exactly:
  git add services/api/src/pitch.py services/api/src/models.py services/api/src/init_db.py services/api/src/main.py services/api/tests/test_pitch.py apps/dashboard/src/app/dashboard/settings/page.tsx
  git commit -m "feat: deterministic sendable email per lead"

Tick Task 8 in the artifact. Do not start Task 9.

Report in five lines or fewer: new test count, full suite count, and paste the five
sample emails.
````

---

## Prompt 9 — Outreach export and copy action

````text
Execute Task 9 of docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
("Task 9: Outreach export and copy action"). Read the task and spec section 7.8 again
before you start.

Scope: extend toCsv and toJson in apps/dashboard/src/lib/leads.ts, add an evidence
helper and the sort, create EmailDialog.tsx, and add a per-lead copy action in both the
dashboard table and the history detail.

Write the four tests in leads.test.ts first and show them failing.

Details that matter:
- CSV column order, exactly:
  business_name, phone, email, website, pitch, evidence, email_subject, email_body, region, query, found_at
- One row per business. Sort by pitch_rank ascending, then mobile_load_ms descending,
  with NULL rank last.
- evidence is a short human string built only from measured facts, for example
  "4.2s mobile load · no chat widget · no HTTPS". Omit facts that were not measured.
- Reuse the existing quoting helper in leads.ts. Do not hand-roll CSV escaping — a body
  containing commas, quotes and newlines is a test case.
- JSON keeps the same fields plus the raw booleans.
- EmailDialog.tsx: a preview dialog showing subject and body with a Copy button using
  navigator.clipboard.writeText. One action per lead row. There is no "copy all" action
  and you must not add one — bulk sending from this tool is how a sending domain gets
  flagged.
- Accessibility: the dialog is a real dialog with a labelled title, focus moves into
  it on open, Escape closes it, and focus returns to the trigger. Use the existing
  dialog pattern in the repo if one exists; if none exists, implement it properly.
- Existing tokens only; npm run lint:design is a gate.

Verification:
  cd apps/dashboard ; npm test ; npm run lint ; npm run lint:design ; npx tsc --noEmit ; npm run build
The build step needs NEXT_PUBLIC_AUTH_MODE=local in the environment. If the build fails
for a reason unrelated to this task, stop and report it rather than editing unrelated
files.

Commit with exactly:
  git add apps/dashboard/src/lib/leads.ts apps/dashboard/src/lib/leads.test.ts apps/dashboard/src/components/LeadResults.tsx apps/dashboard/src/components/EmailDialog.tsx apps/dashboard/src/app/dashboard/history/page.tsx
  git commit -m "feat(dashboard): outreach export and per-lead email copy"

Tick Task 9 in the artifact. Do not start the final verification.

Report in five lines or fewer: new test count, full frontend suite count, whether the
build succeeded, and anything you had to decide differently.
````

---

## Prompt 10 — Final verification and PR

````text
Execute the "Final verification" section of
docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md. This is
verification and documentation only. Do not refactor anything you find unless it is
broken; if something is broken, report it before changing it.

RUN THE GATES
1. .venv\Scripts\python.exe -m pytest services/api/tests -q
2. With Docker Desktop running, the Postgres suite:
   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foundry_test
   .venv\Scripts\python.exe -m pytest services/api/tests -q -m postgres
   If Docker is unavailable, say so explicitly in the report. Do not claim it passed.
3. cd apps/dashboard ; npm run lint:design ; npm run lint ; npx tsc --noEmit ; npm test ;
   NEXT_PUBLIC_AUTH_MODE=local npm run build

RUN THE STACK
4. Start the API and the dashboard in local operator mode:
   API: DATABASE_URL=sqlite:///./local.db, DEV_BYPASS_AUTH=true,
        DEV_TENANT_ID=local_operator, ALLOWED_ORIGINS=http://localhost:3000
   Dashboard: NEXT_PUBLIC_AUTH_MODE=local, NEXT_PUBLIC_API_URL=http://localhost:8000
5. Queue a 10-item batch and let it run to completion. Confirm every item reaches a
   terminal state and the per-item progress is visible. If scraping is rate-limited or
   blocked from this network, say so — do not fake results.
6. Restart test: start a batch, kill the API process while items are still queued,
   restart it, and confirm the queued items resume rather than being marked failed.
   Paste the before/after status of the affected job ids.
7. Confirm every lead row offers a copyable email and that the CSV opens with the
   expected columns and no broken quoting.
8. Check /dashboard and /dashboard/history at 390px and 1440px with the browser tool.
   Report any horizontal overflow. Do not "fix" a layout you were not asked to change
   without telling me first.

DOCUMENT
9. Append a "Phase 2 outcome" section to
   docs/product/2026-11-06-completion-assessment.md: what shipped, what it replaced in
   the original roadmap, the two remaining known limits (create_all + ALTER is not a
   migration system; a 25-item batch can still be rate-limited), and what Phase 3
   still owes (Stripe checkout, portal, webhook lifecycle).
10. Commit:
    git add docs/product/2026-11-06-completion-assessment.md
    git commit -m "docs: record phase 2 outcome and remaining limits"

FINISH
11. git push
12. Tell me the compare URL to open the pull request:
    https://github.com/BradleyXiX/Insight-Scraper/compare/main...feat/phase-2-reliability-throughput?expand=1
    Do not open the pull request yourself.
13. In the PR body I will need, list: the eleven done-when conditions from spec section
    9 with pass or fail next to each, the final test counts, and the reminder that
    branch protection (Settings, Branches, Require status checks: backend, frontend,
    rls) is a repository setting the owner must enable.

Tick "Final verification" in the artifact.

Report in ten lines or fewer: each gate pass or fail, the restart-test result, the two
viewport results, and anything still wrong.
````

---

## What to do when the agent drifts

| Symptom | Response |
|---|---|
| It writes implementation before tests | Paste: "Stop. Revert the implementation. Write the tests from the plan first, run them, show me the failure." |
| It deletes or edits a test to get green | Paste: "You changed a test. Restore it exactly as the plan specifies and explain why you changed it." |
| It starts the next task unasked | Paste: "You are past the scope of this prompt. Stop and report what you have." |
| It pushes during Tasks 2, 3, 5-9 | Paste: "Do not push. Only Task 1, 4 and 10 push." |
| It reports success without output | Paste: "Paste the actual command output. Do not summarise it." |
| It fabricates fixtures or test results | Stop the run. Delete the fabricated files, re-paste the task prompt, and add: "If you cannot capture real data, say so and leave the fixture out." |
