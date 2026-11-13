# Tenant-Scoped Job Recovery — Antigravity IDE Prompt Set

**For:** Gemini Antigravity IDE
**Branch:** `fix/tenant-scoped-job-recovery` (created by Prompt 0)
**Base:** `main` @ `3d0b1ad` (protected; requires `backend`, `frontend`, `rls`)

## What this fixes, and what it does not

`GET /api/jobs` already calls `jobs.recover_jobs(tenant_id)` for the authenticated
tenant (`services/api/src/main.py:198`). That is the recovery path we want, and it is
already correct.

The defect is the second, older call site:

```python
# services/api/src/main.py:33-37
async def lifespan(_: FastAPI):
    logging_setup.configure_logging()
    config.validate_startup()
    jobs.recover_jobs(config.dev_tenant_id())   # ← hardcoded "local_operator"
    yield
```

In production `config.dev_tenant_id()` returns `"local_operator"`, a tenant that does
not exist. So the startup sweep recovers nothing real, while the documentation claims
recovery happens "on API startup". The fix is to delete that call and tell the truth in
the docs — not to add a global sweep, and not to reintroduce a privileged role.

Recovery stays per tenant, triggered when a tenant lists its jobs, because RLS gives no
cross-tenant read path and Phase 2 deliberately deleted the `admin` bypass.

## How to use this file

1. Open the repo in Antigravity. `git status` must show exactly one untracked file:
   this prompt file. Anything else, stop and commit or stash first. Prompt 0 commits
   this file as the branch's first commit so the baseline check starts clean.
2. Paste **Prompt 0** alone. Wait for "baseline green".
3. Then paste **one prompt per message**, in order.
4. If a prompt reports a blocker, fix it or re-paste the same prompt. Never say "just
   continue".
5. Do not let the agent combine Prompt 1 and Prompt 2. The red test output is the point.

---

## Prompt 0 — Setup and baseline

````text
You are the implementer for a small, surgical fix in Insight Scraper: a FastAPI backend
in services/api and a Next.js 16 dashboard in apps/dashboard. The repository is already
open. This message only sets up the run — do not change any file yet.

READ FIRST, IN THIS ORDER
1. AGENTS.md at the repo root. Its design-authority table is binding. This task touches
   no UI, so no design skill applies.
2. services/api/src/main.py — read the whole file. Pay attention to the lifespan
   (lines 32-40), the GET /api/jobs handler, and how tenant_id is obtained
   (`Depends(verify_clerk_token)`).
3. services/api/src/jobs.py — read `recover_jobs` (line 361) and `tenant_session` usage.
4. services/api/src/auth.py — read `verify_clerk_token`. Note that
   `config.dev_tenant_id()` is still required there for the local bypass. Do not delete
   that function.
5. services/api/tests/test_queue.py and services/api/tests/conftest.py — read the
   existing recovery tests and the `client` / `authed_client` / `local_mode` fixtures.

CREATE THE TASK ARTIFACT
6. Use write_to_file with IsArtifact: true and ArtifactType: "task", named
   "Tenant-Scoped Recovery". It contains exactly these lines:

   - [ ] Task 1 — Failing tests
   - [ ] Task 2 — Remove the hardcoded startup recovery
   - [ ] Task 3 — Documentation truth pass
   - [ ] Task 4 — Full verification and push

   Keep it updated as you go. It is the only progress record.

BRANCH
7. Run, one command per line:
   git status
   git checkout main
   git pull --ff-only
   git checkout -b fix/tenant-scoped-job-recovery
   If `git pull` fails, stop and tell me. Do not merge or rebase anything yourself.
8. The only untracked file should be
   docs/superpowers/prompts/2026-11-13-tenant-scoped-job-recovery.md. Commit it now as the
   branch's first commit, message exactly:
     docs: add the tenant-scoped recovery prompt set
   Then run `git status` again and confirm it is clean. If any other file is untracked or
   modified, stop and report it — do not commit it.

BASELINE
9. Prove the starting point is green before changing a single file. From the repo root:
     .venv\Scripts\python.exe -m pytest services/api/tests -q
   Record the exact pass/skip counts. If anything fails, stop and report it. Do not fix
   unrelated tests, do not skip them, do not delete them.
   Do not run the frontend suites yet — this branch touches no frontend file, and CI
   will still run them.

RULES FOR THE WHOLE BRANCH
- One task per message from me. Never begin the next task on your own initiative.
- TDD order is not negotiable: tests first, show the failing output, then implement,
  then show the passing output.
- Never weaken or delete a test to make a suite pass. If you believe a test is wrong,
  stop and explain why.
- Do NOT add a global recovery sweep. Do NOT add a privileged database role or an
  `app.is_admin` setting. Do NOT change `jobs.py`, the schema, `init_db.py`, or
  `render.yaml`. Do NOT remove `config.dev_tenant_id()`.
- Local operator mode must keep working: DATABASE_URL=sqlite:///..., DEV_BYPASS_AUTH=true,
  DEV_TENANT_ID=local_operator for the API.
- Never `git clean`. Never delete untracked files — this repo lives under OneDrive and
  has lost tracked files before.
- If a command cannot run, say so. Do not fake output.

REPORT BACK
Reply with exactly: the branch name, the backend pass/skip counts, and either
"baseline green" or the first failure you hit. Nothing else.
````

---

## Prompt 1 — Failing tests

````text
Execute Task 1 of this branch: write the failing tests. Do not modify any source file in
this message. Add the three tests below to services/api/tests/test_queue.py, at the end
of the file, after the existing recovery tests. Keep the existing tests untouched.

Add these imports at the top of the file if they are not already present:
    from fastapi.testclient import TestClient
    import main
(`jobs`, `tenant_session`, `ScrapeJob`, `create_job`, `claim_job`, `get_job`, `utcnow`
and `timedelta` are already imported there.)

TEST 1 — recovery is scoped to the calling tenant
    OTHER_TENANT = "other_tenant"

    def test_recovery_is_scoped_to_the_calling_tenant():
        mine = make_test_job()
        theirs = create_job(
            OTHER_TENANT, query="plumbers", region="GB", source="gmaps", limit=10
        )
        claim_job(TENANT, mine.id, worker_id="worker_a", lease_seconds=60)
        claim_job(OTHER_TENANT, theirs.id, worker_id="worker_b", lease_seconds=60)

        with tenant_session(TENANT) as db:
            j = db.get(ScrapeJob, mine.id)
            j.lease_expires_at = utcnow() - timedelta(seconds=10)
            j.attempt = 1
        with tenant_session(OTHER_TENANT) as db:
            j = db.get(ScrapeJob, theirs.id)
            j.lease_expires_at = utcnow() - timedelta(seconds=10)
            j.attempt = 1

        counts = recover_jobs(TENANT, max_attempts=3)
        assert counts.get("requeued") == 1

        recovered = get_job(TENANT, mine.id)
        assert recovered is not None
        assert recovered.status == "queued"

        untouched = get_job(OTHER_TENANT, theirs.id)
        assert untouched is not None
        assert untouched.status == "running"
        assert untouched.lease_expires_at is not None
        assert untouched.worker_id == "worker_b"

This is the test the whole branch exists for. It must fail only if `recover_jobs` ever
stops filtering by tenant.

TEST 2 — listing jobs recovers only the caller's tenant (HTTP level)
    def test_listing_jobs_recovers_only_the_callers_tenant(client, local_mode):
        mine = create_job(
            "tenant_a", query="dentists", region="US", source="gmaps", limit=10
        )
        theirs = create_job(
            "tenant_b", query="dentists", region="US", source="gmaps", limit=10
        )
        claim_job("tenant_a", mine.id, worker_id="worker_a", lease_seconds=60)
        claim_job("tenant_b", theirs.id, worker_id="worker_b", lease_seconds=60)

        with tenant_session("tenant_a") as db:
            j = db.get(ScrapeJob, mine.id)
            j.lease_expires_at = utcnow() - timedelta(seconds=10)
            j.attempt = 1
        with tenant_session("tenant_b") as db:
            j = db.get(ScrapeJob, theirs.id)
            j.lease_expires_at = utcnow() - timedelta(seconds=10)
            j.attempt = 1

        main.app.dependency_overrides[main.verify_clerk_token] = lambda: "tenant_a"
        response = client.get("/api/jobs")
        assert response.status_code == 200

        recovered = get_job("tenant_a", mine.id)
        assert recovered is not None
        assert recovered.status == "queued"

        untouched = get_job("tenant_b", theirs.id)
        assert untouched is not None
        assert untouched.status == "running"

This pins the trigger to the authenticated request, not to process startup.

TEST 3 — startup does not recover a hardcoded tenant
    def test_startup_does_not_recover_a_hardcoded_tenant(monkeypatch):
        calls: list[tuple] = []

        def spy(*args, **kwargs):
            calls.append((args, kwargs))
            return {"requeued": 0, "failed": 0, "cancelled": 0}

        monkeypatch.setattr(jobs, "recover_jobs", spy)
        with TestClient(main.app):
            pass

        assert calls == []

Entering `TestClient(main.app)` runs the real lifespan. After this branch, the lifespan
must not call `recover_jobs` at all. Do not assert on `"local_operator"` specifically —
assert the call count is zero, so a future hardcoded tenant also fails this test.

RUN THEM AND SHOW ME THE OUTPUT
    .venv\Scripts\python.exe -m pytest services/api/tests/test_queue.py -q

Expected: Test 1 and Test 2 pass already (the per-tenant filter and the GET /api/jobs
call are already in place), Test 3 fails with `AssertionError: assert [(('local_operator',), {})] == []`.

That is the correct red state. If Test 1 or Test 2 fails, stop and report the failure
with its output instead of continuing — it means the premise of this branch is wrong.

Do not implement anything yet. Do not commit. Reply with: the three test names, and the
pass/fail line for each. Nothing else.
````

---

## Prompt 2 — Remove the hardcoded startup recovery

````text
Execute Task 2. Make the failing test pass with the smallest change that is honest.

CHANGE 1 — services/api/src/main.py, the lifespan (lines 32-40)
Remove exactly this line:
    jobs.recover_jobs(config.dev_tenant_id())

Leave `logging_setup.configure_logging()` and `config.validate_startup()` in place. The
lifespan becomes:

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        logging_setup.configure_logging()
        config.validate_startup()
        # No global recovery sweep here. RLS scopes every read to one tenant, so a
        # startup sweep could only ever touch a hardcoded tenant id. Abandoned leases
        # are recovered per tenant by `recover_jobs(tenant_id)` in GET /api/jobs.
        yield

Use that comment verbatim. It is the explanation a future reader needs, and it is why
there is no third option here.

CHANGE 2 — services/api/src/main.py, GET /api/jobs
Above the existing `jobs.recover_jobs(tenant_id)` call, add this comment and change
nothing else in the handler:

        # The only recovery trigger. Idempotent and RLS-scoped, so it is safe on every
        # list request: a tenant's abandoned jobs resume the moment they open the
        # dashboard, and no other tenant's rows are visible to this session.

Do not touch `jobs.py`. Do not touch `auth.py`. Do not touch `config.py`.

RUN
    .venv\Scripts\python.exe -m pytest services/api/tests/test_queue.py -q

Expected: all tests in the file pass, including `test_startup_does_not_recover_a_hardcoded_tenant`.

Then run the whole backend suite and show me the summary line:
    .venv\Scripts\python.exe -m pytest services/api/tests -q

Expected: same pass count as baseline plus 3, same skip count. If any pre-existing test
fails, stop and report which one and its traceback. Do not modify it.

Do not commit yet. Reply with: the two files/lines changed, the test_queue.py result,
and the full-suite summary line. Nothing else.
````

---

## Prompt 3 — Documentation truth pass

````text
Execute Task 3. The code now recovers per tenant on access. Three documents still claim
otherwise, and one of them is the product record. Fix only these, in place, with no
rewriting beyond the sentences named.

CHANGE 1 — docs/product/2026-11-06-completion-assessment.md, section 11,
"What shipped", item 3 (around line 331)
Current text ends with: "...heartbeat background task, and `recover_jobs` on API
startup. Abandoned running jobs and queued items resume cleanly upon restart rather than
sticking or failing."

Replace that item with:

3. **Lease-based crash-resilient queue (§9.3):** Single guarded `claim_job` SQL update
   with lease expiry and a heartbeat background task. Abandoned leases are recovered by
   `recover_jobs(tenant_id)`, which runs when a tenant lists its jobs (`GET /api/jobs`).
   There is no global startup sweep: RLS provides no cross-tenant read path, and the
   `admin` bypass was deliberately removed in §9.4. A tenant's abandoned running jobs and
   queued items resume the moment that tenant opens the dashboard.

CHANGE 2 — same file, "Remaining known limits" (around line 344)
Append exactly one bullet at the end of that list:

- Job recovery is lazy and per tenant. A tenant that never calls `GET /api/jobs` leaves
  its expired leases untouched until its next request; nothing reads those rows in the
  meantime, so this is a delay in cleanup, not a correctness gap.

CHANGE 3 — docs/superpowers/specs/2026-11-07-phase-2-reliability-and-throughput-design.md
Read the "Recovery, per tenant" paragraph (around line 253). If it already describes
recovery on access and does not mention startup, leave it alone and say so. If it
mentions startup recovery, correct only that sentence to match the implementation. Do not
rewrite the design.

CHANGE 4 — docs/superpowers/plans/2026-11-08-phase-2-reliability-and-throughput.md
Leave this file alone. It is a historical plan and is allowed to describe what was
planned. Do not retro-edit plans.

Do not touch README.md — it makes no recovery claim.
Do not add new sections, tables, or roadmap items.

VERIFY
    git diff --stat
    git diff

Read your own diff back. Every sentence you changed must be true of the code as it now
stands. If any changed sentence asserts a behaviour you have not seen in the tests, delete
that sentence instead of softening it.

Commit this task and Task 2 together as one commit, message exactly:

    fix(api): recover abandoned jobs per tenant, not for a hardcoded one

Reply with: the diff stat, and one sentence per file saying what you changed. Nothing else.
````

---

## Prompt 4 — Full verification and push

````text
Execute Task 4. Prove the branch is mergeable, then push it. Do not open the PR yourself;
I will open it from the URL you give me.

VERIFICATION, IN THIS ORDER, SHOWING ME EACH SUMMARY LINE
1. Backend, all tests:
     .venv\Scripts\python.exe -m pytest services/api/tests -q
2. Backend, Postgres/RLS tests. If Docker is running:
     docker run -d --name insight-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=foundry_test -p 55432:5432 postgres:16
     $env:TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:55432/foundry_test"
     .venv\Scripts\python.exe -m pytest services/api/tests -q -m postgres
   Expected: 3 passed. If Docker is not available, say so explicitly and do not claim
   these ran — CI runs them, and that is the gate that matters.
3. Frontend, unchanged but must still be green for CI. From apps/dashboard:
     npm test
     npm run lint:design
     npm run lint
     npx tsc --noEmit
4. Confirm the branch touches only what it should:
     git diff --stat main...HEAD
   Expected files: services/api/src/main.py, services/api/tests/test_queue.py, and the
   two docs from Task 3. If `jobs.py`, `config.py`, `auth.py`, `init_db.py`,
   `render.yaml`, or anything under apps/ appears, stop and report it — that is scope
   creep and must be reverted before pushing.
5. Confirm the removed line is genuinely gone:
     git grep -n "recover_jobs" -- services/api/src
   Expected exactly two hits: the definition in `jobs.py`, and the call in the
   `GET /api/jobs` handler. No hit in `main.py`'s lifespan.

PUSH
6. Run:
     git push -u origin fix/tenant-scoped-job-recovery
   If the push is rejected, stop and report the error. Do not force-push, ever.

REPORT BACK
Reply with exactly:
- the four verification summary lines (and whether Postgres tests ran)
- the output of `git diff --stat main...HEAD`
- the compare URL:
  https://github.com/BradleyXiX/Insight-Scraper/compare/main...fix/tenant-scoped-job-recovery?expand=1
- the commit sha

Nothing else. Do not merge. Do not push to main.
````

---

## After the agent reports back

1. Open the compare URL, create the PR against `main`, title:
   `fix(api): recover abandoned jobs per tenant, not for a hardcoded one`
2. Wait for `backend`, `frontend`, and `rls` to go green. The ruleset blocks the merge
   until all three pass.
3. Merge with a **merge commit** (not squash) so the red-then-green test sequence stays
   in history, matching PR #5.
4. Post-merge check on Render: after the auto-deploy, logs must show
   `Application startup complete` with **no** `job.requeued` line for `local_operator`,
   and a signed-in dashboard load must still return jobs.

## What this does not solve

A tenant that never opens the dashboard keeps its expired leases until it does. That is
the accepted trade-off of per-tenant recovery; it costs nothing while nothing reads those
rows. If that ever becomes a real problem, the honest fix is a scheduled worker that
iterates known tenant ids from a table that is itself not tenant-scoped — a new design,
not a tweak to this one.
