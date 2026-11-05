# Insight Scraper — Motion Prompt Pack

Fourteen Antigravity sessions, in order. One deliverable each. Copy-paste; do not skip A1.

**The plan is the source of truth, not this file.** Every session tells the agent to read its task from `docs/superpowers/plans/2026-11-05-insight-scraper-motion.md` before it touches code, then quote that task's `Interfaces` block back to you as proof it read it. That keeps this pack short and stops the two documents drifting apart. If a session and the plan disagree, the plan wins — say so and stop.

Why fourteen sessions: Antigravity sessions are stateless and drift. A session that starts at Task 1 and ends at Task 14 will invent spacing values around Task 5 and forget the delete list by Task 10. One task per session keeps the constraints in attention and the diff reviewable.

**Design decisions are already made.** Do not re-diagnose, do not re-choose values, do not propose a different direction. The spec at `docs/superpowers/specs/2026-11-05-insight-scraper-motion-design.md` is approved, including the accent change, the logo, the public pricing page and the pricing redirect.

---

## A0 — Branch (terminal, not Antigravity)

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\Source Code\Insight Scraper"
git status --short
git checkout main
git pull origin main
git checkout -b design/motion
```

Then commit the untracked scaffolding **before** A1, so the spec, plan, skills and lint gate travel with the diff:

```powershell
git add .agents .claude AGENTS.md docs scripts skills-lock.json
git commit -m "chore: add design skills, spec, plan and lint gate"
git status --short
```

Expect a clean tree afterwards. Do **not** run `git checkout main` again — Render deploys `main` only, and this branch is what keeps the redesign off production.

---

## PREAMBLE — paste at the top of every session A1–A14

```text
Repo: C:\Users\Admin\OneDrive\Desktop\Source Code\Insight Scraper
Work in: apps/dashboard/   (backend touch is exactly one string, services/api/src/main.py:15)
Branch: design/motion   (never switch to main, never push, never merge)

Before writing any code:
1. Read docs/superpowers/plans/2026-11-05-insight-scraper-motion.md
2. Read only the task named below. Read the spec sections it cites.
3. Reply with that task's Interfaces block quoted verbatim, then proceed.
   Quoting it is how you prove you read it instead of guessing.

The plan is authoritative. If you think it is wrong, stop and say why. Do not
improvise a different design, a different file layout, or a different number.

Approved values. These are the only colours in the product:
  background #000000   surface #181818   surface-hover #1F1F1F
  border #272727       border-strong #313131
  accent #18A9C2       accent-quiet rgba(24,169,194,0.12)
  attention #F59E0B    attention-quiet rgba(245,158,11,0.10)
  danger #F87171       danger-quiet rgba(248,113,113,0.10)
They live in apps/dashboard/src/app/globals.css and nowhere else. Never inline a
hex in a component.

Hard rules:
- No new dependencies. Removing three, @react-three/fiber, @react-three/drei and
  @types/three is required in A5. Adding anything is a failure.
- Icons stay lucide-react, 1.5px stroke, 20px. Recorded exception, not an oversight.
- Mono is JetBrains Mono, and only on data: table cells, timings, IDs, the
  wordmark's second word. Not buttons, not body, not labels.
- Uppercase is chrome only: nav labels, table headers, badges, eyebrows.
  Headings, buttons and body are sentence case.
- No hyphen inside body copy, headings or labels. Rewrite the phrase.
- No background gradients. The only gradient is the hero heading text,
  #FFFFFF -> #9B9B9B, defined in globals.css.
- No glow anywhere except the scan indicator during an active scrape.
- No rounded-full. No rounded-* outside the zero scale.
- No arbitrary Tailwind values (text-[..], p-[..], w-[..]) - the lint gate rejects them.
- Motion: cubic-bezier(0.22, 1, 0.36, 1), 500ms for movement, 300ms for colour
  and opacity, never under 200ms. Animate transform and opacity only.
- prefers-reduced-motion is honoured by every animation, no exceptions.
- Do not refactor logic, rename files, or change the API contract.
- Do not rename POSTGRES_DB, databaseName, foundry_user, or the db.py default DSN.
  They are database identifiers, not display strings.

Skills:
- Load landing-page-design for its Part B values only. The spec already fixes
  which values apply; do not re-derive them.
- Do NOT load frontend-design, impeccable, theme-factory or webgl-3d-object.
  They contradict landing-page-design and will produce a blended result.
- Do not re-run the redesign diagnosis. It is done and recorded in the spec's §3.

Gate, run before you claim the session is done:
  cd apps/dashboard
  npx tsc --noEmit
  npm run lint:design
  (npm test and npm run build where the task says so)
Paste the real output. A passing claim without output is a failed session.

Commits: conventional commits, one per task, as the plan specifies. `git add`
named paths only - never `git add -A`, because the repo lives under OneDrive and
picks up stray files.

Stop when the named deliverable is done. Do not start the next task.
```

---

## A1 — Gate baseline

```text
<preamble>

Task 1 from the plan. Deliverable: `npm run lint:design` exists and runs.

Add "lint:design": "node scripts/design-lint.mjs src" to apps/dashboard/package.json.
Run it. It will exit 1. Paste the full output and record the error/warning counts
in the commit message. That baseline (expected 23 errors, 4 warnings) is what
every later session is measured against.

Note for later: the script exempts files named globals/theme/tokens from the
hardcoded-hex and arbitrary-value rules, so the palette belongs in globals.css
and components must use tokens, never raw values.

Stop after the script runs and is committed.
```

---

## A2 — Tokens

```text
<preamble>

Task 2 from the plan. Deliverable: globals.css holds the approved system.

This is the only session allowed to change values. Use the file content from
Task 2 Step 1 verbatim - it is not a starting point, it is the answer.

Three deletions matter as much as the additions:
- `* { border-radius: 0 !important }` goes.
- The global `h1..h6 { text-transform: uppercase }` goes.
- `input, button` stop being forced to mono.

Do not restyle any component in this session. Indigo surfaces will look wrong
until A12; that is expected.

Stop after tokens compile and the lint count has dropped.
```

---

## A3 — Logo and rename

```text
<preamble>

Task 3 from the plan. Deliverable: the bracket mark ships, Foundry-SaaS is gone
from everything a human reads, and the database identifiers are untouched.

Read the Next 16 docs named in Task 3 Step 1 before creating icon.svg or
opengraph-image.tsx. Do not guess the file convention.

The mark is decided. Do not redesign it, do not centre the square, do not add a
gradient, do not round the strokes. Two brackets and one lifted square.

Run the two verification commands in Step 7 and paste both outputs. The first
must be empty; the second must still show foundry and foundry_user.

Stop after the rename is verified.
```

---

## A4 — Pure logic and tests

```text
<preamble>

Task 4 from the plan. Deliverable: lead signals, KPIs and CSV live in
src/lib/leads.ts with node:test coverage.

Write the tests first, run them, watch them fail, then implement. Do not write
the implementation first and back-fill tests.

Two behaviours are easy to get wrong and are tested on purpose:
- mobile_load_ms of 0 means "not measured", not "fast". It must never appear in
  the mean and must render as N/A, never 0 ms.
- A load of exactly 3000 is not slow. The threshold is strictly greater than.

Keep dashboard/page.tsx working in this session: delete the inline helpers and
import from src/lib/leads.ts, nothing else.

Stop after `npm test` passes and tsc is silent.
```

---

## A5 — Remove the 3D layer

```text
<preamble>

Task 5 from the plan. Deliverable: HeroScene and the four three.js packages are
gone, and the bundle delta is recorded.

Record the `/` First Load JS figure before you change anything and after. Put
both numbers in the commit message. If the number does not drop materially, stop
and report instead of claiming success.

The hero will be empty after this session. That is expected; A6 fills it.

Stop after the rebuild passes.
```

---

## A6 — The extraction demo

```text
<preamble>

Task 6 from the plan. Deliverable: <ExtractionDemo /> plays a real extraction.

This is the one moment people will remember. Build it exactly to the spec's
§5.3 sequence, including the timings. Do not add a second effect, do not add a
parallax layer, do not add a particle field.

Non-negotiables:
- Starts on IntersectionObserver, not on mount.
- Replays at most twice, then holds. A text Replay button re-runs it.
- Reduced motion renders the final state immediately, with no timers at all.
- Every timer is cleared on unmount.
- Bars animate transform: scaleX(), never width.
- No window scroll listener anywhere.

The five rows come from src/lib/demo-data.ts and must use the pitch values that
getPitchHook would return for them. A demo that shows a pitch the product would
not produce is a lie.

Stop after the demo plays, replays, and respects reduced motion.
```

---

## A7 — Landing page

```text
<preamble>

Task 7 from the plan. Deliverable: `/` is rebuilt around the demo.

Section order is fixed: hero, tagline reveal, how it works, benefits (two column
zig zag, not three equal cards), signals, FAQ, final CTA, footer.

Copy rules that are not optional:
- Hero heading and subheading are given in the plan. Use them verbatim.
- No sci-fi theatre. No "Initialize Sequence", no "View Schematics", no
  "Absolute Isolation", no "unauthorized nodes".
- No invented testimonials, customer logos or statistics. There are none in this
  product. If a proof slot is needed, render {{testimonial}} verbatim.
- Prices are real: $49 per month.
- Six FAQ entries, no hyphens in the copy.

Stop after the page renders at 390px with the primary CTA above the fold.
```

---

## A8 — Public pricing

```text
<preamble>

Task 8 from the plan. Deliverable: /pricing is public and reachable from `/`.

Two tiers only, copied from dashboard/billing: Pro at $49 per month and
Enterprise at Custom. Both CTAs go to /sign-up. This page never calls checkout.

Do not add a third tier, do not invent an annual discount, do not add a
comparison table.

Stop after /pricing renders signed out.
```

---

## A9 — Dashboard shell

```text
<preamble>

Task 9 from the plan. Deliverable: the shell survives 1024px and 768px.

Read the Next 16 template.md doc before creating template.tsx. Confirm the
export name; do not guess.

The breakpoint is lg, not md. At 768px a fixed 256px sidebar leaves 448px for
content, which the table cannot survive. Below lg the sidebar becomes a top bar
with a slide-over drawer.

Also required in this session: a skip link as the first focusable element, a
2px accent active bar with no glow, and Escape closing the drawer and returning
focus to the menu button.

Stop after the drawer works and nothing overflows at 1024 or 768.
```

---

## A10 — Scrape state machine and KPIs

```text
<preamble>

Task 10 from the plan. Deliverable: every scrape outcome has an honest state.

The five phases and their exact messages are in the plan. Do not invent a sixth,
do not collapse empty into error, do not collapse 402 into a generic failure.

This session removes the last alert() in the app and the last silent catch.
A backend that is down must look different from a query that found nothing, and
both must look different from an inactive subscription.

The stage strip is three stages, not five. The API is one blocking POST with no
progress channel, so a five stage strip would be fabricated. Past 20 seconds it
switches to an indeterminate line so a long run does not read as stalled. Cancel
aborts the request.

Stop after you have exercised all four failure paths and pasted the results.
```

---

## A11 — Results table and mobile cards

```text
<preamble>

Task 11 from the plan. Deliverable: results are readable at 390px and at 1024px.

One component, two renders: a real table at lg and above, a card list below.
Do not mutate the table into cards. Do not use horizontal scroll as the mobile
strategy - that is the bug this task exists to fix.

Signal encoding: slow load is attention, fast load is full weight foreground
with tabular-nums, chatbot present is an outline chip, chatbot absent takes the
accent. Do not reintroduce emerald. There is no third hue.

Test with a 60 character business name at 390px. It must wrap, not overflow.

Stop after both renders are verified.
```

---

## A12 — Billing, settings, history, pricing redirect

```text
<preamble>

Task 12 from the plan. Deliverable: the indigo collision is gone and the broken
route stops existing.

Keep handleSubscribe and the orgId gate byte-identical. The Stripe flow works
today; do not touch it.

/dashboard/pricing posts placeholder Stripe IDs and errors on submit. It becomes
a redirect in next.config.ts, and PricingCard.tsx is deleted. Do not keep the
component "just in case".

Settings has a Save button with no handler and four tabs with no handlers.
Remove them and say plainly that settings are not available in this build. A
control that looks live and does nothing is worse than no control.

Stop after the redirect resolves and the placeholder IDs are gone.
```

---

## A13 — Clerk surfaces

```text
<preamble>

Task 13 from the plan. Deliverable: sign-in and sign-up match the product.

Minimum scope: one shared appearance object, radius 0, accent, fonts, flat card,
no shadow, and the theatre copy removed. Do not restructure Clerk's component
tree, do not build a custom form.

SECURE_LOGIN_TERMINAL and SYS_STATUS: ONLINE are removed.

Stop after both pages render with no glow and visible focus.
```

---

## A14 — Gate and handoff

```text
<preamble>

Task 14 from the plan. Deliverable: the branch is reviewable.

Run all four gates and paste real output:
  npx tsc --noEmit
  npm test
  npm run lint:design
  npm run build

Then the visual checks: 1920, 1440, 1024, 768, 390. No horizontal overflow,
nothing clipped. Keyboard through `/`, the sidebar, the action bar, results and
billing. Reduced motion forced. Console clean on every route.

If the pack at docs/design-prompts/README.md drifted from the plan, update it in
this session.

Draft the PR body. Do not merge, do not push to main.

Stop after the PR body is printed.
```

---

## Deterministic gate (run outside Antigravity, after every session)

```powershell
cd apps/dashboard
npm run lint:design
```

Exit 1 means a rule was broken. It does not care which model wrote the code, which is the whole point. Run it yourself after A2, A4, A7, A9, A11 and A13 — do not rely on the session's own claim.

## What "done" looks like

- `design-lint: clean (src)`
- `npm test` green, `npm run build` green, `npx tsc --noEmit` silent
- `/` shows a working extraction demo and one CTA
- `/pricing` is public; `/dashboard/pricing` redirects to billing
- `/dashboard` shows KPIs, three honest stages, a cancel, and cards at 390px
- no `alert()`, no silent catch, no glow outside the scan indicator, no `three` in `package.json`
