# Public demo + hosted guard rails

**Date:** 2026-11-20
**Branch:** `feat/public-demo` (off `main`, after the docs PR merges)
**Status:** design — awaiting approval

## Problem

The app is three things at once, and one URL is trying to be all of them:

1. the operator's local lead engine,
2. a portfolio artifact a stranger clicks,
3. a hosted SaaS that will charge money later.

Today a stranger clicking `insight-scraper.vercel.app` gets a $49/month sales page
("Get started", "Free to sign up. Cancel anytime."), then a Clerk sign-in wall, and if
they get through, a red banner reading *"Could not reach the extraction service. Check
that the API is running, then retry."* Three promises, none of which are true yet.

Two measured facts shape the design:

- The free Render instance took **58 s** to wake on a cold `/health` hit. It is not
  down; it is asleep. The client has **no timeout**, so it either hangs or throws.
- A visitor who signs up **cannot run anything**: `services/api/src/auth.py` returns
  **403** when the token has no Clerk organization, and there is no tenant
  provisioning function. Organisations must be created by hand.

So the public path must not depend on the API, auth, or Render at all.

## Goal

A stranger can see **real output** from one real run, on any device, with no account,
no sign-up, and no cold start — and understands that running their own extraction is
**not open yet, but is the direction**.

Non-goals (explicitly out of scope for this change):

- public sign-up, a demo tenant, or scraping from the demo,
- any change to the tenant model, RLS policies, or auth path,
- Stripe, pricing logic, or entitlement behaviour,
- rebuilding the landing page's visual design.

## Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **`/demo` is static.** It renders a committed snapshot of one real run; it makes no API calls. | Removes every failure mode instead of dressing them up. Survives Render sleep, works with the API stopped, cannot 500. |
| 2 | **Reuse `KpiStrip`, `LeadResults`, `EmailDialog` unchanged.** | They are presentational and already take a `LeadItem[]`. Zero divergence between "demo" and "the real thing". |
| 3 | **Mask phone and email in the public snapshot.** Keep business name, website, load time, chatbot flag, pitch, evidence, and the full email text. | Publishing an aggregated, scraped contact list is a different act from using it for outreach. The email body contains no recipient address. The page states that contact details are masked. |
| 4 | **Show the search toolbar, disabled, with explicit copy.** Not hidden. | It proves the product is a real tool with regions/sources/limits, and states the boundary honestly: extraction requires access. |
| 5 | **Landing primary CTA becomes "See sample output" → `/demo`.** Secondary "Sign in" for the operator. "Free to sign up. Cancel anytime." is removed. Pricing stays listed but is labelled as planned, not purchasable. | Stops selling something that cannot be bought or used. |
| 6 | **`/dashboard` stays Clerk-gated and is no longer linked from any public page.** | Keeps the operator's real workspace intact; a stranger never reaches an empty or broken dashboard. |
| 7 | **Hosted dashboard gets a 75 s timeout and wake-up copy.** | The operator will still hit the sleep when demoing the hosted copy. `NETWORK_FAILURE` stops telling clients to "check that the API is running". |
| 8 | **Hide the Billing nav item when there is no workspace (`orgId === null`), and wall the dashboard for that session.** | Removes the sales affordance from a surface where it cannot be honoured, and stops the 403 loop where the error tells the user to use a control that does not exist. |
| 9 | **No personal-workspace fallback now.** Sign-up remains closed. | It is the correct future fix, but it is auth/tenant work, not demo work, and it needs its own tests. Recorded as the Phase 3 prerequisite. |
| 10 | **The masking rule applies to the already-published artifacts too.** | The README currently publishes `sample-leads.csv`, the dashboard screenshots and an email from this same run with real phone numbers and addresses. Masking only the new page would make its "contact details are masked" line false. |

Nothing here is subtractive: no auth bypass, no `if demo` branch inside tenant code,
no shared demo tenant. The demo is a read-only page over a frozen artifact, so none of
the multi-tenant structure needs rebuilding when billing turns on.

## Build

**Data**

- `apps/dashboard/src/lib/demo-run.ts` — snapshot of job `9394dd39-5cfe-44d4-b1e2-2b5fd26cf4a7`
  (`dental clinic` / `KE` / `gmaps` / limit 10) as a typed module, in the API's lead
  JSON shape, with `phone` set to `"—"` and `email` to `""`. Includes `captured_at`,
  `query`, `region`, `source`, `limit`. A `.ts` module, not `.json`, so `node --test`
  needs no JSON import attributes.
- `apps/dashboard/src/lib/demo-run.ts` — typed accessor (`DEMO_RUN`) and the
  provenance line rendered on the page.
- `apps/dashboard/src/lib/demo-run.test.ts` — guards the artifact: ≥ 8 leads, every
  lead has a pitch and evidence, and **no `phone`/`email` value survives** except the
  mask.

**Page**

- `apps/dashboard/src/app/demo/page.tsx` — public server component: top bar (logo,
  "Sample output", link home, "Sign in"), provenance banner ("A real run, captured
  2026-11-18 · dental clinic · KE · Google Maps · 10 leads · contact details masked"),
  disabled toolbar, `<KpiStrip>` + `<LeadResults>`, and the "not open yet" note.
- `apps/dashboard/src/components/DemoExport.tsx` — client component with the existing
  `toCsv`/`downloadFile` helpers so a visitor can take the sample away.
- No new layout: `Providers` at the root already supplies `AppAuthProvider`, and
  `LeadResults` needs no auth.

**Copy edits**

- `apps/dashboard/src/app/page.tsx` — CTA and footer.
- `apps/dashboard/src/app/pricing/page.tsx` — "Not available yet. Pricing shown is
  planned." above the tiers; CTA points at `/demo`.
- `apps/dashboard/src/components/SidebarNav.tsx` — filter `hostedOnly` on `orgId` too.

**Resilience**

- `apps/dashboard/src/lib/http.ts` — `fetchWithTimeout(url, init, 75_000)`.
- `apps/dashboard/src/lib/jobs.ts` — use it for every API call.
- `apps/dashboard/src/lib/errors.ts` — `NETWORK_FAILURE` becomes "The extraction
  service did not respond. The demo instance sleeps when idle, so the first request
  can take up to a minute. Retry once."; 503 gets the same framing.

**Docs**

- README: add the `/demo` link and one sentence on what it is.
- Replace the published artifacts with masked versions of the same run:
  `docs/assets/sample-leads.csv`, the three dashboard screenshots, and two new demo
  screenshots. The README caption stops claiming the export is unedited.

## Risks

- **Masking reduces realism.** The page says so; the analysis (load time, pitch) is
  still the genuine output.
- **A frozen snapshot ages.** The provenance line carries the capture date, so it
  reads as a record, not a live feed.
- **Two demo datasets.** `lib/demo-data.ts` is invented data for the landing
  animation; it stays, but gets an "Illustrative" label so it is not mistaken for
  output.
- **README conflict.** The portfolio README is being rewritten on
  `docs/portfolio-readme`. This branch must be cut after that PR merges, and touches
  only the demo paragraph, or the README edit is deferred to a follow-up commit.

## Acceptance

1. With the API stopped, `/demo` returns 200 and renders 10 leads.
2. `/demo` with `NEXT_PUBLIC_API_URL` pointed at a dead port: ten leads render, no
   request reaches that URL, no console errors, at 1440×900 and 390×844. One-off
   browser check; no committed harness, so CI stays as it is.
3. `npm test` green, including the new `demo-run`, `nav`, `workspace` and `http`
   tests; `eslint`, `lint:design`, `tsc --noEmit`, `next build` green.
4. `demo-run.ts` and the regenerated `sample-leads.csv` contain no `@` and no Kenyan
   phone number.
5. On `/`, the only primary CTA is "See a real extraction"; no "Free to sign up" and
   no `/sign-up` link remain on `/`, `/pricing` or `/demo`.
6. `visibleDestinations(false, null)` excludes Billing (unit test), and a hosted
   session with no organization gets the access wall instead of the form. Operator
   confirms the wall in the Vercel preview, since no Clerk test user is available
   from CI.
