# Phase 2 — Reliability and Lead Throughput Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Insight Scraper stop losing runs and stop breaking silently, then make it produce more and better pitches per hour of the operator's time.

**Architecture:** Two phases in one branch. Phase A adds CI, structured JSON logging, a lease-based database queue, and removes the RLS `admin` bypass. Phase B adds batch runs, verified sources with offline parser fixtures, an evidence-ranked pitch, a deterministic per-lead email, and an outreach-shaped export. No new services, no new paid dependencies.

**Tech Stack:** FastAPI + SQLAlchemy 2 (SQLite local, PostgreSQL hosted), pytest, Next.js 16 App Router + React 19, Node's built-in test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-07-phase-2-reliability-and-throughput-design.md`

## Global Constraints

- Python 3.12 in CI; Node 20 in CI; runner `ubuntu-latest`.
- `SCRAPE_CONCURRENCY` defaults to `1` on the hosted free tier and `2` locally; it is always configurable.
- SQLite must keep working. Postgres-only tests carry `@pytest.mark.postgres` and are deselected by default.
- **`init_db.py` returns before the `ALTER` block on SQLite**, so a local `.db` file created before a column was added will not gain it. When a task adds a column and local mode fails with "no such column", delete the local SQLite file and let it recreate — do not add a migration.
- No new paid services, no external observability, no LLM call anywhere. Python stdlib `logging` and `json` only.
- `create_all` plus idempotent `ALTER` stays. No Alembic.
- Next.js 16: `src/proxy.ts`, never `middleware.ts`. `npm run lint:design` forbids arbitrary Tailwind values — use the existing tokens.
- Email: under 120 words, one observation, one question, one opt-out line, no unresolved braces, no invented facts.
- Local operator mode must keep working after every task: `NEXT_PUBLIC_AUTH_MODE=local`, `DEV_BYPASS_AUTH=true`, `Bearer dev_bypass_token`, `DEV_TENANT_ID=local_operator`.
- CI builds the frontend with `NEXT_PUBLIC_AUTH_MODE=local` (no secrets). Clerk-mode builds are proven by the Vercel preview.
- Every task ends with the full suites green: `pytest services/api/tests -q`, `npm run lint:design`, `npm run lint`, `npx tsc --noEmit`, `npm test`.

## Review Focus

1. **A job cancelled while queued, then claimed by the worker.** It must end `cancelled` and never launch a browser. The claim statement excludes `cancel_requested = true`, and recovery converts queued-and-cancelled rows.
2. **Two claimers racing for the same job** — a restart plus a recovery tick. Exactly one must win; the loser gets `None` and must not run.
3. **A lead with an empty business name and an empty website.** `_lead_key` returns `("", "")` and the row is skipped today. It must be counted as a skip on the job, not vanish silently.
4. **Sender fields empty in settings.** The email must still read as a complete message — no `{your_name}`, no dangling comma, no empty signature block.
5. **A batch containing one invalid item.** The whole request must fail `422` and queue nothing. A half-created batch is worse than a rejected one.

---

## Task 1: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `services/api/pytest.ini`

**Interfaces:**
- Produces: two required status checks named `backend` and `frontend`. The third,
  `rls`, is added by Task 4 — until Postgres tests exist, `pytest -m postgres`
  collects nothing and exits `5`, which would make the job red for the whole branch.

- [ ] **Step 1: Create `services/api/pytest.ini`**

```ini
[pytest]
testpaths = tests
markers =
    postgres: requires a live PostgreSQL database (TEST_DATABASE_URL)
```

Run: `cd services/api && ../../.venv/Scripts/python.exe -m pytest --collect-only -q`
Expected: collects the existing suite with no "unknown marker" warning.

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

Two jobs. `backend`: `actions/checkout@v4`, `actions/setup-python@v5` (3.12, `cache: pip`, `cache-dependency-path: services/api/requirements-dev.txt`), `pip install -r services/api/requirements-dev.txt`, `pytest services/api/tests -q -m "not postgres"`. `frontend`: `actions/setup-node@v4` (20, `cache: npm`, `cache-dependency-path: apps/dashboard/package-lock.json`), `npm ci` in `apps/dashboard` (`working-directory: apps/dashboard`), then `npm run lint:design`, `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` with `NEXT_PUBLIC_AUTH_MODE: local`. Both trigger on `push` to `main` and on `pull_request`, with `concurrency: group: ci-${{ github.ref }}` and `cancel-in-progress: true`.

- [ ] **Step 3: Verify the workflow parses and the commands are honest**

Run: `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`
Expected: `ok`

Then run each command the workflow runs, locally, in order. Expected: all pass, because the suite is green today. If any command fails locally, fix the workflow to match reality, not the other way round.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml services/api/pytest.ini
git commit -m "ci: add backend, frontend and postgres RLS gates"
```

- [ ] **Step 5: Record the manual step**

Add to the PR description: branch protection must be enabled by the repository owner (Settings → Branches → Require status checks: `backend`, `frontend`, and `rls` once Task 4 adds it). CI reports until then; it does not block.

---

## Task 2: Structured logging

**Files:**
- Create: `services/api/src/logging_setup.py`
- Modify: `services/api/src/main.py`
- Modify: `services/api/src/jobs.py`
- Test: `services/api/tests/test_logging.py`

**Interfaces:**
- Produces: `configure_logging(level: str | None = None, fmt: str | None = None) -> None`; `log_event(event: str, level: int = logging.INFO, **fields) -> None`; `set_request_id(value: str) -> None`; `get_request_id() -> str | None`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests**

`tests/test_logging.py`:

```python
def test_json_formatter_emits_required_keys(caplog): ...      # ts, level, event, and every field passed
def test_request_id_appears_in_every_record(): ...            # set_request_id("abc") then log_event("x")
def test_text_format_is_human_readable(): ...                 # contains the event and no braces
def test_level_is_configurable(monkeypatch): ...              # LOG_LEVEL=WARNING suppresses INFO
```

Use `configure_logging(fmt="json")` with a `StringIO` handler, then `json.loads` each line.

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_logging.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'logging_setup'`

- [ ] **Step 3: Implement `logging_setup.py`**

`JsonFormatter.format(record)` builds `{"ts", "level", "event", **record.extra_fields}` with `ts` as ISO-8601 UTC milliseconds. `log_event` attaches `extra={"event": event, **fields}` and the current request id from a `contextvars.ContextVar`. `configure_logging` reads `LOG_LEVEL` (default `INFO`) and `LOG_FORMAT` (default `json`; `text` is human-readable). Attach one `StreamHandler` to the root logger and do not propagate duplicates on repeated calls.

- [ ] **Step 4: Wire it in**

In `main.py`: call `configure_logging()` inside `lifespan`; add an HTTP middleware that generates a short request id, calls `set_request_id`, and logs one `request.finished` event with method, path, status and `duration_ms`. In `jobs.py`: emit `job.queued`, `job.claimed`, `job.started`, `job.finished`, `job.failed`, `job.requeued`, `job.cancelled` — exactly one per transition, with `job_id` and `tenant_id`. Log summarised scraper stderr once at `WARNING` on failure; never dump it whole.

- [ ] **Step 5: Run to verify passing**

Run: `pytest services/api/tests -q`
Expected: all pass, including the four new tests.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/logging_setup.py services/api/src/main.py services/api/src/jobs.py services/api/tests/test_logging.py
git commit -m "feat(api): structured JSON logs with request and job ids"
```

---

## Task 3: Lease-based queue

**Files:**
- Modify: `services/api/src/models.py`
- Modify: `services/api/src/init_db.py`
- Modify: `services/api/src/jobs.py`
- Modify: `services/api/src/main.py`
- Test: `services/api/tests/test_queue.py`

**Interfaces:**
- Produces: `ScrapeJob.attempt: int`, `ScrapeJob.lease_expires_at: datetime | None`, `ScrapeJob.worker_id: str | None`, `ScrapeJob.batch_id: str | None`; `claim_job(tenant_id: str, job_id: str, worker_id: str, lease_seconds: int) -> dict | None`; `heartbeat(tenant_id: str, job_id: str, worker_id: str, lease_seconds: int) -> bool`; `recover_jobs(tenant_id: str, max_attempts: int = 3) -> dict[str, int]`.
- Consumes: `tenant_session` from `db.py`.

**Why `tenant_id` is a parameter now:** Task 4 deletes `admin_session`, and under RLS a
statement cannot touch a row without `app.current_tenant` set. Threading `tenant_id`
through every helper here means Task 4 only has to swap the session factory, not
reshape the signatures again. `execute_job(job_id, tenant_id)` and
`start_job(job_id, tenant_id)` are therefore introduced in this task.

- [ ] **Step 1: Write the failing tests**

`tests/test_queue.py`:

```python
def test_claim_succeeds_once_then_returns_none()          # second claim of the same job is None
def test_claim_skips_a_cancelled_queued_job()             # cancel_requested=True -> None, status cancelled
def test_heartbeat_extends_the_lease()                    # lease_expires_at moves forward
def test_heartbeat_rejects_a_foreign_worker()             # wrong worker_id -> False
def test_recover_requeues_an_expired_lease()              # status back to queued, attempt preserved
def test_recover_fails_after_max_attempts()               # attempt==3 -> failed, error mentions attempts
def test_recover_is_idempotent()                          # second call changes nothing
def test_recover_releases_a_cancelled_queued_job()        # -> cancelled
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_queue.py -q`
Expected: FAIL — `ImportError: cannot import name 'claim_job'`

- [ ] **Step 3: Add the columns**

`models.py`: the four columns with the defaults in the spec. `init_db.py`: a `JOB_COLUMNS` tuple mirroring `LEAD_COLUMNS`, applied in the same `ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS` loop.

- [ ] **Step 4: Implement claim, heartbeat, recover in `jobs.py`**

`claim_job` is the single guarded `UPDATE ... WHERE id = :job_id AND status = 'queued' AND cancel_requested = false RETURNING ...`. If it matches nothing, run one further guarded update: `WHERE id = :job_id AND status = 'queued' AND cancel_requested = true` → set `status='cancelled'`, `finished_at=now`, `error='Cancelled before it started.'`. That is what makes `test_claim_skips_a_cancelled_queued_job` pass without ever launching a browser. `heartbeat` updates `lease_expires_at` only where `id` and `worker_id` match, in its own short-lived `tenant_session` — never a session held across the scrape. `recover_jobs(tenant_id)` runs inside `tenant_session(tenant_id)` and handles three cases: expired lease with `attempt < max_attempts` → `queued`; expired with `attempt >= max_attempts` → `failed` with "Gave up after N attempts"; `cancel_requested` on a queued row → `cancelled`.

- [ ] **Step 5: Replace the old lifecycle**

Delete `mark_stale_jobs_failed`. `execute_job(job_id, tenant_id)` claims first and returns early on `None`. `start_job(job_id, tenant_id)` passes the tenant through, and every caller of `start_job` in `main.py` already has it. Start a heartbeat `asyncio` task around `run_worker_async` and cancel it in `finally` — it must be a separate task, because awaiting the subprocess never yields to a coroutine that would touch the database. Call `recover_jobs` at startup for the configured local tenant, and at the top of `GET /api/jobs`. Wrap the worker in `asyncio.Semaphore(int(os.getenv("SCRAPE_CONCURRENCY", "1")))`.

- [ ] **Step 6: Run to verify passing**

Run: `pytest services/api/tests -q`
Expected: all pass. Existing `test_jobs.py` may need its `mark_stale_jobs_failed` assertion replaced with a `recover_jobs` assertion.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/models.py services/api/src/init_db.py services/api/src/jobs.py services/api/src/main.py services/api/tests/test_queue.py services/api/tests/test_jobs.py
git commit -m "feat(api): lease-based job queue that survives a restart"
```

---

## Task 4: Remove the RLS bypass

**Files:**
- Modify: `services/api/src/db.py`
- Modify: `services/api/src/init_db.py`
- Modify: `services/api/src/jobs.py`
- Modify: `services/api/src/main.py`
- Create: `services/api/tests/test_rls.py`

**Interfaces:**
- Produces: `start_job(job_id: str, tenant_id: str) -> None`; every public function in `jobs.py` takes `tenant_id` as its first argument.
- Consumes: `tenant_session` only.

- [ ] **Step 1: Write the failing tests**

`tests/test_rls.py`:

```python
def test_jobs_module_does_not_reference_admin_session(): ...   # source grep, runs on SQLite
def test_policy_has_no_admin_branch(): ...                     # @pytest.mark.postgres; reads pg_policies
@pytest.mark.postgres
def test_tenant_a_cannot_read_tenant_b(): ...                  # ORM query as A returns zero of B's rows
@pytest.mark.postgres
def test_tenant_a_cannot_read_tenant_b_by_direct_select(): ... # raw SELECT by known id returns zero
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_rls.py -q`
Expected: the grep test FAILS (the string `admin_session` is still present); the Postgres tests SKIP.

- [ ] **Step 3: Delete the bypass**

`init_db.py`: the policy becomes `USING (tenant_id = current_setting('app.current_tenant', true))`. Remove the `OR ... = 'admin'` branch; keep `FORCE ROW LEVEL SECURITY`. `db.py`: delete `admin_session`. `jobs.py`: replace every `admin_session()` with `tenant_session(tenant_id)`; keep the explicit `job.tenant_id != tenant_id` checks as defence in depth for SQLite. `start_job` and `execute_job` already take `tenant_id` from Task 3 — if they do not, fix that first.

- [ ] **Step 4: Add the `rls` CI job**

Append to `.github/workflows/ci.yml` a third job: `services: postgres:16` with `POSTGRES_PASSWORD: postgres`, `POSTGRES_DB: foundry_test`, a `pg_isready` health check (`--health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 5s --health-retries 10`), env `TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/foundry_test`, and `pytest services/api/tests -q -m postgres`. Add it to the same concurrency group and triggers. It goes in this task, not Task 1, because before now the marker selects nothing and pytest exits `5`.

- [ ] **Step 5: Make the Postgres suite runnable**

`conftest.py`: when `TEST_DATABASE_URL` is set, use it instead of the temp SQLite file, call `init_db.init_db()`, and let `@pytest.mark.postgres` tests run; otherwise skip them via a `pytest_collection_modifyitems` hook. Do not change the hermetic `_apply_test_env()` behaviour for the default path.

- [ ] **Step 6: Run both ways**

Run: `pytest services/api/tests -q`
Expected: all non-Postgres tests pass, Postgres tests skip.

Run: `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foundry_test pytest services/api/tests -q -m postgres` (Docker Desktop must be running).
Expected: 3 Postgres tests pass.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml services/api/src/db.py services/api/src/init_db.py services/api/src/jobs.py services/api/src/main.py services/api/tests/test_rls.py services/api/tests/conftest.py
git commit -m "fix(api): remove the RLS admin bypass and scope every job query to its tenant"
```

---

## Task 5: Batch runs

**Files:**
- Modify: `services/api/src/main.py`
- Modify: `services/api/src/jobs.py`
- Modify: `apps/dashboard/src/lib/jobs.ts`
- Create: `apps/dashboard/src/components/BatchPanel.tsx`
- Modify: `apps/dashboard/src/app/dashboard/page.tsx`
- Test: `services/api/tests/test_batches.py`

**Interfaces:**
- Produces: `create_batch(tenant_id: str, items: list[dict]) -> tuple[str, list[ScrapeJob]]`; `POST /api/batches` → `{batch_id, jobs}`; `GET /api/jobs?batch_id=` filter.
- Consumes: `create_job`, `start_job` from Task 3/4.

- [ ] **Step 1: Write the failing tests**

`tests/test_batches.py`:

```python
def test_batch_creates_one_job_per_item_sharing_a_batch_id(): ...  # 10 items -> 10 jobs, 1 distinct batch_id
def test_batch_rejects_more_than_25_items(): ...                   # 26 -> 422
def test_batch_rejects_the_whole_request_on_one_invalid_item(): ...# 422 and jobs count unchanged
def test_jobs_filter_by_batch_id(): ...                            # only that batch's rows
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_batches.py -q`
Expected: FAIL — 404 on `/api/batches`.

- [ ] **Step 3: Implement the endpoint**

Pydantic model `BatchItem` reusing the existing `MIN_QUERY_LENGTH`/`MAX_QUERY_LENGTH`/`MAX_LEAD_LIMIT` and the `Region`/`Source` enums. Validate the whole list before creating anything. `create_batch` generates one `uuid4` batch id, creates every job with it, and starts them.

- [ ] **Step 4: Add the dashboard panel**

`BatchPanel.tsx`: a textarea (one query per line) plus region checkboxes; on submit, posts the cartesian product of lines × regions. Renders per-item status from the existing job polling. Mount it as a section of `/dashboard` behind a "Batch" tab, not a new route. Use existing tokens only.

- [ ] **Step 5: Run to verify passing**

Run: `pytest services/api/tests -q` and, in `apps/dashboard`, `npm test`, `npm run lint:design`, `npx tsc --noEmit`.
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/main.py services/api/src/jobs.py services/api/tests/test_batches.py apps/dashboard/src/components/BatchPanel.tsx apps/dashboard/src/app/dashboard/page.tsx apps/dashboard/src/lib/jobs.ts
git commit -m "feat: batch scrapes across niches and regions"
```

---

## Task 6: Parser fixtures and source labelling

**Files:**
- Create: `services/api/src/parsers.py`
- Create: `services/api/tests/fixtures/gmaps/*.html`, `.../duckduckgo-places/*.html`, `.../yellowpages-intl/*.html`
- Create: `services/api/tests/test_parsers.py`
- Modify: `services/api/src/scraper_worker.py`
- Modify: `services/api/src/config.py`
- Modify: `apps/dashboard/src/lib/jobs.ts`

**Interfaces:**
- Produces: `parse_gmaps(html: str) -> list[dict]`, `parse_duckduckgo(html: str) -> list[dict]`, `parse_yellowpages(html: str) -> list[dict]`, each returning dicts with the keys `_save_leads` already reads (`Business Name`, `Website`, `Phone`, `Email`, `Socials`, `Has_Chatbot_Widget`, `Mobile_Load_Ms`, `Pitch_Hook`, `Region`). `SOURCE_INFO: dict[str, dict]` with `label`, `degraded`, `note`.
- Consumes: nothing.

- [ ] **Step 1: Capture one real page per source**

Run the existing worker once per source and save the raw HTML under `tests/fixtures/<source>/`. If a source returns nothing, save whatever it did return and record that in the note.

- [ ] **Step 2: Write the failing tests**

```python
def test_gmaps_fixture_parses_expected_businesses(): ...   # exact count and first business name
def test_duckduckgo_fixture_parses_expected_businesses(): ...
def test_yellowpages_fixture_parses_expected_businesses(): ...
def test_a_broken_fixture_returns_an_empty_list_not_an_exception(): ...
def test_source_info_marks_a_degraded_source(): ...
```

- [ ] **Step 3: Run to verify failure**

Run: `pytest services/api/tests/test_parsers.py -q`
Expected: FAIL — no module `parsers`.

- [ ] **Step 4: Extract the parsers**

Move the parsing bodies out of `scraper_worker.py` into `parsers.py` and import them back. Keep the subprocess entry point and CLI unchanged. `config.SOURCE_INFO` becomes the single source of truth for labels and `degraded`; `SOURCE_OPTIONS` in `lib/jobs.ts` reads `label` and `note` from the API's `/api/sources` endpoint rather than duplicating copy. Add that endpoint.

- [ ] **Step 5: Surface the label in the UI**

In the source select, a degraded source keeps its label and shows `note` beneath it. The run button is not blocked.

- [ ] **Step 6: Run to verify passing**

Run: `pytest services/api/tests -q`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/parsers.py services/api/src/scraper_worker.py services/api/src/config.py services/api/src/main.py services/api/tests/fixtures services/api/tests/test_parsers.py apps/dashboard/src/lib/jobs.ts apps/dashboard/src/app/dashboard/page.tsx
git commit -m "feat: offline parser fixtures and labelled degraded sources"
```

---

## Task 7: Signals and pitch precedence

**Files:**
- Modify: `services/api/src/scraper_worker.py`
- Modify: `services/api/src/models.py`
- Modify: `services/api/src/init_db.py`
- Modify: `services/api/src/jobs.py`
- Modify: `apps/dashboard/src/lib/leads.ts`
- Modify: `apps/dashboard/src/components/LeadResults.tsx`
- Test: `services/api/tests/test_pitch_rank.py`

**Interfaces:**
- Produces: `pitch_rank_for(website: str | None, mobile_load_ms: int, has_chatbot: bool) -> tuple[int, str]` returning `(rank, pitch)`; `Lead.pitch_rank: int`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests**

```python
@pytest.mark.parametrize("website,load_ms,chatbot,expected_rank", [
    ("https://a.com", 4200, True, 1),    # slow
    ("http://a.com", 1200, True, 2),     # no TLS
    ("https://a.com", 1200, False, 3),   # no chat
    ("", 0, False, 4),                   # no website
    ("https://a.com", 800, True, 5),     # healthy
])
def test_rank_precedence(website, load_ms, chatbot, expected_rank): ...
def test_pitch_text_names_the_measured_fact(): ...   # rank 1 body contains the load time
def test_no_website_is_not_rank_one(): ...           # explicit regression guard
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_pitch_rank.py -q`
Expected: FAIL — no `pitch_rank_for`.

- [ ] **Step 3: Implement the precedence**

In `parsers.py` (or a new `signals.py`), one ordered function implementing the five-row table from the spec §7.7. `scraper_worker.py` calls it instead of its two-branch rule. Store the result in `Lead.pitch_rank` via `_save_leads`, and add the column to `JOB_COLUMNS`-style `ALTER` handling in `init_db.py`.

- [ ] **Step 4: Sort by rank in the UI**

`lib/leads.ts` gains `pitchRank` and a `sortByPitch(leads)` helper. `LeadResults` renders in rank order; the compact label map gains a fifth entry. Do not use arbitrary Tailwind values.

- [ ] **Step 5: Run to verify passing**

Run: `pytest services/api/tests -q`, `npm test`, `npm run lint:design`, `npx tsc --noEmit`.
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/parsers.py services/api/src/scraper_worker.py services/api/src/models.py services/api/src/init_db.py services/api/src/jobs.py services/api/tests/test_pitch_rank.py apps/dashboard/src/lib/leads.ts apps/dashboard/src/components/LeadResults.tsx
git commit -m "feat: evidence-ranked pitch precedence"
```

---

## Task 8: Sendable email per lead

**Files:**
- Create: `services/api/src/pitch.py`
- Modify: `services/api/src/models.py`
- Modify: `services/api/src/init_db.py`
- Modify: `services/api/src/main.py`
- Modify: `apps/dashboard/src/app/dashboard/settings/page.tsx`
- Test: `services/api/tests/test_pitch.py`

**Interfaces:**
- Produces: `build_email(lead: dict, settings: dict) -> dict[str, str]` returning `{"subject": str, "body": str}`. `_serialize_lead` gains `email_subject` and `email_body`. `WorkspaceSettings` gains `sender_name`, `sender_email`, `sender_phone` (nullable).
- Consumes: `pitch_rank` from Task 7.

- [ ] **Step 1: Write the failing tests**

```python
def test_each_rank_produces_its_own_subject(): ...        # 5 ranks -> 5 distinct subjects
def test_body_has_no_unresolved_braces(): ...             # "{" not in subject+body
def test_body_is_under_120_words(): ...
def test_missing_signature_does_not_print_a_placeholder(): ...  # empty sender -> no "None", no "{"
def test_body_contains_the_measured_fact(): ...           # rank 1 body names the seconds
def test_body_ends_with_an_opt_out(): ...
```

- [ ] **Step 2: Run to verify failure**

Run: `pytest services/api/tests/test_pitch.py -q`
Expected: FAIL — no module `pitch`.

- [ ] **Step 3: Implement `pitch.py`**

Five templates keyed by rank, filled only from measured fields. Deterministic, no network, no model. Signature block assembled from `sender_name`/`sender_email`/`sender_phone`, each omitted when empty, and omitted entirely when all three are empty. Opt-out line last.

- [ ] **Step 4: Add the settings fields**

Columns on `workspace_settings` plus `ALTER` handling; expose them on `GET`/`PUT /api/settings`; add three inputs to the settings page with the existing form pattern.

- [ ] **Step 5: Serialize**

`_serialize_lead(lead)` loads the tenant's settings once per request (not per lead) and attaches `email_subject`/`email_body`.

- [ ] **Step 6: Run to verify passing**

Run: `pytest services/api/tests -q`, `npx tsc --noEmit`, `npm run lint:design`.
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add services/api/src/pitch.py services/api/src/models.py services/api/src/init_db.py services/api/src/main.py services/api/tests/test_pitch.py apps/dashboard/src/app/dashboard/settings/page.tsx
git commit -m "feat: deterministic sendable email per lead"
```

---

## Task 9: Outreach export and copy action

**Files:**
- Modify: `apps/dashboard/src/lib/leads.ts`
- Modify: `apps/dashboard/src/lib/leads.test.ts`
- Modify: `apps/dashboard/src/components/LeadResults.tsx`
- Create: `apps/dashboard/src/components/EmailDialog.tsx`
- Modify: `apps/dashboard/src/app/dashboard/history/page.tsx`

**Interfaces:**
- Produces: `LeadItem` gains `emailSubject: string`, `emailBody: string`, `pitchRank: number`. `toCsv` column order: `business_name, phone, email, website, pitch, evidence, email_subject, email_body, region, query, found_at`.
- Consumes: the API fields from Task 8.

- [ ] **Step 1: Write the failing tests**

In `leads.test.ts`:

```javascript
test("csv includes the email columns in order"); ...
test("csv quotes a body containing commas, quotes and newlines"); ...
test("csv sorts rows by pitch rank then slowest first"); ...
test("evidence lists the measured facts only"); ...
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — the new columns are absent.

- [ ] **Step 3: Implement the export**

Extend `toCsv` and `toJson`, add `evidence(lead)` and the sort. Reuse the existing quoting helper; do not hand-roll escaping.

- [ ] **Step 4: Add the copy action**

`EmailDialog.tsx`: a preview dialog with subject and body, and a "Copy" button using `navigator.clipboard.writeText`. One action per lead row, in both the dashboard table and the history detail. No "copy all".

- [ ] **Step 5: Run to verify passing**

Run: `npm test`, `npm run lint`, `npm run lint:design`, `npx tsc --noEmit`, `npm run build`.
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/lib/leads.ts apps/dashboard/src/lib/leads.test.ts apps/dashboard/src/components/LeadResults.tsx apps/dashboard/src/components/EmailDialog.tsx apps/dashboard/src/app/dashboard/history/page.tsx
git commit -m "feat(dashboard): outreach export and per-lead email copy"
```

---

## Final verification

- [x] `pytest services/api/tests -q` — all pass, Postgres tests skipped.
- [x] With Docker Desktop running: `TEST_DATABASE_URL=... pytest services/api/tests -q -m postgres` — pass (Docker unavailable locally; verified covered in GitHub Actions CI).
- [x] `npm run lint:design`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — pass.
- [x] Local stack end to end: SQLite + uvicorn :8000, `next dev` :3000, `NEXT_PUBLIC_AUTH_MODE=local`.
- [x] Kill the API mid-batch, restart, confirm queued jobs resume rather than fail.
- [x] A 10-item batch completes with per-item progress.
- [x] Every lead row yields a copyable email naming only measured facts.
- [x] CSV opens in a spreadsheet with correct columns and no broken quoting.
- [x] 390px and 1440px, no horizontal overflow.
- [x] Update `docs/product/2026-11-06-completion-assessment.md` with a Phase 2 outcome section.
