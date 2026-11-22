# Public Demo + Hosted Guard Rails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a stranger a public, read-only page showing one real extraction, and remove the sales and dead-end states that currently misrepresent the product.

**Architecture:** A `/demo` route renders a committed JSON snapshot of job `9394dd39-5cfe-44d4-b1e2-2b5fd26cf4a7` through the existing presentational components, making no API calls. Public pages point at it instead of `/sign-up`. The hosted dashboard gets a request timeout, wake-up copy, and a no-workspace wall.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, Tailwind 4, `node --test` for `src/lib/*.test.ts`.

**Spec:** `docs/product/2026-11-20-public-demo.md`

## Global Constraints

- No new dependencies. No Playwright, no test-library, no JSON schema package.
- `/demo` must make **zero** requests to `NEXT_PUBLIC_API_URL`. Do not import `@/lib/jobs` or `@/lib/api` from the demo route.
- Phone in the published snapshot is the string `"—"`; email is the empty string. The email subject/body stay verbatim.
- Reuse `KpiStrip`, `LeadResults`, `EmailDialog`, `toCsv`, `downloadFile` unchanged.
- Copy: no "Free to sign up", no "Get started", no `/sign-up` link on `/`, `/pricing`, or the demo page.
- Tests run with `npm test` from `apps/dashboard` and must match `src/lib/*.test.ts`.
- Branch `feat/public-demo` off `main`; do not edit `README.md` until Task 7.

## Review Focus

1. A visitor whose JavaScript fails or is slow: `/demo` must still serve the lead table in the initial HTML.
2. A visitor opening the email dialog on a masked row: subject and body must still be there, only the address is gone.
3. A signed-in user with no Clerk organization: must see the access wall, never the extraction form or a 403 loop.
4. A cold Render instance: a request must fail within ~75 s with retry copy, not hang forever.
5. Leftover sales copy or `/sign-up` links on any public page.

---

### Task 1: Demo snapshot, typed accessor, and privacy test

**Files:**
- Create: `apps/dashboard/src/lib/demo-run.ts` (data plus accessor — no `.json` import, so `node --test` and Next agree)
- Test: `apps/dashboard/src/lib/demo-run.test.ts`

**Interfaces:**
- Consumes: `LeadItem` from `@/lib/leads`.
- Produces: `interface DemoRun { captured_at: string; query: string; region: string; source: string; source_label: string; limit: number; leads: LeadItem[] }`, `const DEMO_RUN: DemoRun`, `const DEMO_PROVENANCE: string`.

- [ ] **Step 1: Generate the snapshot**

Start the API against the existing database and read the job's leads:

```powershell
cd C:\dev\Insight-Scraper\services\api
$env:DATABASE_URL="sqlite:///./src/local.db"; $env:DEV_BYPASS_AUTH="true"; $env:DEV_TENANT_ID="local_operator"
python -m uvicorn src.main:app --port 8010
# separate terminal:
curl.exe -s -H "Authorization: Bearer dev_bypass_token" "http://localhost:8010/api/jobs/9394dd39-5cfe-44d4-b1e2-2b5fd26cf4a7/leads" -o C:\Users\Admin\AppData\Local\Temp\opencode\demo-leads.json
```

Transform it with a one-off script (not committed): keep `business_name`, `phone`, `email`, `website`, `has_chatbot_widget`, `mobile_load_ms`, `pitch_hook`, `pitch_rank`, `region`, `email_subject`, `email_body`; set `phone` to `"—"` and `email` to `""`; replace any mojibake `�` in `pitch_hook` with `—`; drop `id`, `tenant_id`, `job_id`, `created_at`, `query`. Write the result into the `leads` array of Step 4's module, with:

```ts
captured_at: "2026-11-18",
query: "dental clinic",
region: "KE",
source: "gmaps",
source_label: "Google Maps",
limit: 10,
```

- [ ] **Step 2: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_RUN, DEMO_PROVENANCE } from "./demo-run.ts";
import { toCsv, getEmailBody, getEmailSubject } from "./leads.ts";

test("the demo carries ten real leads from the captured run", () => {
  assert.equal(DEMO_RUN.leads.length, 10);
  assert.equal(DEMO_RUN.query, "dental clinic");
  assert.equal(DEMO_RUN.region, "KE");
  for (const lead of DEMO_RUN.leads) {
    assert.ok(lead.business_name);
    assert.ok(lead.pitch_hook && lead.pitch_hook.length > 0);
    assert.ok(typeof lead.pitch_rank === "number");
  }
});

test("contact details are masked but the email is still sendable", () => {
  for (const lead of DEMO_RUN.leads) {
    assert.equal(lead.phone, "—");
    assert.equal(lead.email, "");
    assert.ok(getEmailSubject(lead).length > 0);
    assert.ok(getEmailBody(lead).length > 0);
  }
});

test("no address survives anywhere in the published snapshot", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(new URL("./demo-run.ts", import.meta.url), "utf8");
  assert.equal(raw.includes("@"), false);
  assert.equal(/\b0[17]\d{8}\b/.test(raw), false);
});

test("provenance names the run without implying it is live", () => {
  assert.match(DEMO_PROVENANCE, /2026-11-18/);
  assert.match(DEMO_PROVENANCE, /masked/i);
});

test("the export a visitor downloads is masked too", () => {
  const csv = toCsv(DEMO_RUN.leads, { region: DEMO_RUN.region, query: DEMO_RUN.query });
  assert.equal(csv.includes("@"), false);
  assert.equal(csv.includes("0707459099"), false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/dashboard; npm test`
Expected: FAIL — `Cannot find module './demo-run.ts'`.

- [ ] **Step 4: Implement `demo-run.ts`**

```ts
import type { LeadItem } from "./leads";

export interface DemoRun {
  captured_at: string;
  query: string;
  region: string;
  source: string;
  source_label: string;
  limit: number;
  leads: LeadItem[];
}

export const DEMO_RUN: DemoRun = {
  captured_at: "2026-11-18",
  query: "dental clinic",
  region: "KE",
  source: "gmaps",
  source_label: "Google Maps",
  limit: 10,
  leads: [
    // Step 1 output: ten LeadItem objects with phone "—" and email "".
  ],
};

export const DEMO_PROVENANCE =
  "One real run, captured 2026-11-18. Contact details are masked for publication; " +
  "load times, signals and pitches are exactly what the tool produced.";
```

Data lives in the module rather than a `.json` file so `node --test` needs no JSON import attributes and the browser bundle needs no runtime file read.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/dashboard; npm test`
Expected: PASS, 5 new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/lib/demo-run.ts apps/dashboard/src/lib/demo-run.test.ts
git commit -m "feat(demo): add masked snapshot of a real extraction run"
```

---

### Task 2: Nav destinations become testable

**Files:**
- Create: `apps/dashboard/src/lib/nav.ts`
- Test: `apps/dashboard/src/lib/nav.test.ts`
- Modify: `apps/dashboard/src/components/SidebarNav.tsx`

**Interfaces:**
- Produces: `type NavIcon = "search" | "history" | "billing" | "settings"`, `interface NavDestination { href: string; label: string; icon: NavIcon; exact?: boolean; hostedOnly?: boolean }`, `const DESTINATIONS: NavDestination[]`, `function visibleDestinations(isLocal: boolean, orgId: string | null): NavDestination[]`.

Icons stay as string keys so this module has no React or `lucide-react` import and can run under `node --test`.

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { visibleDestinations } from "./nav.ts";

test("billing is hidden in local mode", () => {
  const hrefs = visibleDestinations(true, "local_operator").map((d) => d.href);
  assert.equal(hrefs.includes("/dashboard/billing"), false);
});

test("billing is shown to a workspace with an organization", () => {
  const hrefs = visibleDestinations(false, "org_123").map((d) => d.href);
  assert.deepEqual(hrefs, [
    "/dashboard",
    "/dashboard/history",
    "/dashboard/billing",
    "/dashboard/settings",
  ]);
});

test("billing is hidden from a signed-in user with no workspace", () => {
  const hrefs = visibleDestinations(false, null).map((d) => d.href);
  assert.equal(hrefs.includes("/dashboard/billing"), false);
  assert.equal(hrefs.length, 3);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/dashboard; node --test "src/lib/nav.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `nav.ts`**

Move the `DESTINATIONS` array and destination shape out of `SidebarNav.tsx`, replacing each `icon: Search` style value with `icon: "search"` (and `"history"`, `"billing"`, `"settings"`). Then add:

```ts
export function visibleDestinations(
  isLocal: boolean,
  orgId: string | null,
): NavDestination[] {
  return DESTINATIONS.filter((item) => {
    if (!item.hostedOnly) return true;
    if (isLocal) return false;
    return orgId !== null;
  });
}
```

- [ ] **Step 4: Rewire `SidebarNav.tsx`**

Import `visibleDestinations` and `NavDestination`; destructure `{ isLocal, orgId }` from `useAppAuth()`; replace the local filter with `const destinations = visibleDestinations(isLocal, orgId)`. Delete the moved declarations. Add a local map so the render stays the same:

```tsx
const ICONS: Record<NavIcon, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  search: Search,
  history: History,
  billing: CreditCard,
  settings: Settings,
};
```

and use `const Icon = ICONS[item.icon];`.

- [ ] **Step 5: Verify**

Run: `cd apps/dashboard; npm test; npx tsc --noEmit; npx eslint src/components/SidebarNav.tsx src/lib/nav.ts`
Expected: all pass, no unused-import warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/lib/nav.ts apps/dashboard/src/lib/nav.test.ts apps/dashboard/src/components/SidebarNav.tsx
git commit -m "refactor(nav): make destination visibility a tested function"
```

---

### Task 3: The `/demo` page

**Files:**
- Create: `apps/dashboard/src/app/demo/page.tsx`
- Create: `apps/dashboard/src/components/DemoExport.tsx`

**Interfaces:**
- Consumes: `DEMO_RUN`, `DEMO_PROVENANCE` (Task 1); `KpiStrip`, `LeadResults`, `toCsv`, `downloadFile`, `exportBaseName`.
- Produces: nothing consumed later.

- [ ] **Step 1: Write the export client component**

`DemoExport.tsx` is `"use client"`, takes `{ leads, region, query }` typed as `LeadItem[]`, `string`, `string`, and renders two buttons styled like the dashboard's CSV/JSON controls. `onClick` calls `downloadFile(\`${exportBaseName({ query, region })}.csv\`, toCsv(leads, { region, query }), "text/csv;charset=utf-8;")`, and the JSON equivalent with `toJson`. Label them `CSV` and `JSON`.

- [ ] **Step 2: Write the page**

`page.tsx` is a server component (no `"use client"`) exporting `metadata` with `title: "Sample output — Insight Scraper"`. It renders, in order, inside the existing tokens (`bg-background`, `panel`, `text-foreground`, `font-mono`, `border-border`, `accent`):

1. A top bar: `Logo size={24}`, a `Sample output` badge, `Link href="/"` labelled `Home`, `Link href="/sign-in"` labelled `Sign in`.
2. A banner with `DEMO_PROVENANCE`, plus the run line: `dental clinic · KE · Google Maps · 10 leads`.
3. A disabled toolbar: three `select` elements (`disabled`, values Kenya / Google Maps / 10 leads) and an input with `disabled placeholder="Extraction is not open to the public yet"`, plus a disabled submit button reading `Start extraction`. Under it, one sentence: `Extraction runs on the operator's machine today. Public accounts are not open yet — this page is a read-only sample of what a run produces.`
4. `<KpiStrip leads={DEMO_RUN.leads} />`.
5. A heading row mirroring the dashboard: `Extracted leads`, `10 shown`, `dental clinic · KE · gmaps`.
6. `<LeadResults leads={DEMO_RUN.leads} region={DEMO_RUN.region} />`.
7. `<DemoExport leads={DEMO_RUN.leads} region={DEMO_RUN.region} query={DEMO_RUN.query} />`.
8. A footer line: `Want a run like this for your market? Get in touch.` linking `mailto:sales@insightscraper.com` (the address the billing page already uses).

`LeadResults` and `KpiStrip` are client components; importing them into a server component is correct and keeps the initial HTML populated.

- [ ] **Step 3: Verify it builds and serves without the API**

```powershell
cd apps/dashboard
$env:NEXT_PUBLIC_AUTH_MODE="local"; $env:NEXT_PUBLIC_API_URL="http://127.0.0.1:9"
npm run build
```

Expected: `/demo` listed as a static or dynamic route, no build errors.

- [ ] **Step 4: Verify the HTML and the no-API rule**

Run the built app (`npm start`), then:

```powershell
curl.exe -s http://localhost:3000/demo | Select-String -Pattern "Garden Family Dental Clinic|Contact details are masked"
```

Expected: both strings present in the initial HTML. Also confirm the page source contains no `localhost:8000` or API URL string, and `grep -r "lib/jobs\|lib/api" apps/dashboard/src/app/demo` returns nothing.

- [ ] **Step 5: Browser check at both widths**

Load `/demo` at 1440×900 and 390×844 with the API port pointed at a dead address. Confirm: table on desktop, cards on mobile, KPI values populated, no console errors, no failed request to the API. Open one email dialog and confirm subject and body render with no address.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/app/demo/page.tsx apps/dashboard/src/components/DemoExport.tsx
git commit -m "feat(demo): public read-only sample route"
```

---

### Task 4: Stop selling what cannot be bought

**Files:**
- Modify: `apps/dashboard/src/app/page.tsx`
- Modify: `apps/dashboard/src/app/pricing/page.tsx`
- Modify: `apps/dashboard/src/components/SiteFooter.tsx`

**Interfaces:** none.

- [ ] **Step 1: Landing page**

- Nav "Get started" (`/sign-up`) → `See sample` (`/demo`).
- Hero primary CTA `Run a sample extraction` (`/sign-up`) → `See a real extraction` (`/demo`). Keep `See pricing` as the secondary link.
- Delete the line `Free to sign up. Cancel anytime.` and replace it with `Read-only sample. No account needed.`
- Any remaining `/sign-up` link in this file → `/demo`.

- [ ] **Step 2: Pricing page**

- Above the tier grid, add one line: `Pricing is planned. Subscriptions are not open yet; the sample output shows what a run produces.`
- Pass `ctaHref="/demo"` and `ctaText="See sample output"` to both `PriceTier` instances.
- Replace the footer line `Free to sign up. Contact support to change or cancel a subscription.` with `Planned pricing. Subscriptions are not open yet.`

- [ ] **Step 3: Footer**

Delete the `Sign up` link and its `href="/sign-up"`. Keep `Pricing` and `Sign in`.

- [ ] **Step 4: Label the invented landing animation**

In `apps/dashboard/src/components/ExtractionDemo.tsx`, add a small badge reading `Illustrative` next to the panel's existing heading/badge row, styled like the existing `font-mono uppercase text-xs` badges. `lib/demo-data.ts` is invented data (`512-555-…` numbers); it must not be read as the real sample.

- [ ] **Step 5: Verify no sales remnants remain on public pages**

```powershell
cd apps/dashboard
Select-String -Path src/app/page.tsx,src/app/pricing/page.tsx,src/components/SiteFooter.tsx -Pattern "Free to sign up|Get started|/sign-up|\$49" 
```

Expected: only the `$49` price value on the pricing tier (`price="$49"`), which is planned pricing, and no `Free to sign up`, no `Get started`, no `/sign-up`.

- [ ] **Step 6: Verify build**

Run: `npm run lint; npm run lint:design; npx tsc --noEmit; npm run build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/app/page.tsx apps/dashboard/src/app/pricing/page.tsx apps/dashboard/src/components/SiteFooter.tsx apps/dashboard/src/components/ExtractionDemo.tsx
git commit -m "copy: point public pages at the sample output"
```

---

### Task 5: Access wall for a signed-in user with no workspace

**Files:**
- Create: `apps/dashboard/src/lib/workspace.ts`
- Test: `apps/dashboard/src/lib/workspace.test.ts`
- Modify: `apps/dashboard/src/app/dashboard/layout.tsx`

**Interfaces:**
- Produces: `function requiresWorkspace(isLocal: boolean, orgId: string | null): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { requiresWorkspace } from "./workspace.ts";

test("local mode never needs a workspace", () => {
  assert.equal(requiresWorkspace(true, null), false);
});

test("a hosted session without an organization needs a workspace", () => {
  assert.equal(requiresWorkspace(false, null), true);
});

test("a hosted session with an organization does not", () => {
  assert.equal(requiresWorkspace(false, "org_123"), false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/dashboard; node --test "src/lib/workspace.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `workspace.ts`**

```ts
/** A hosted session with no Clerk organization cannot be scoped to a tenant. */
export function requiresWorkspace(isLocal: boolean, orgId: string | null): boolean {
  return !isLocal && orgId === null;
}
```

- [ ] **Step 4: Render the wall in `dashboard/layout.tsx`**

Destructure `orgId` alongside `isLocal` from `useAppAuth()`. After the existing hooks (do not return before them), if `requiresWorkspace(isLocal, orgId)`, return a minimal page instead of the shell: centred `Logo`, heading `Access is by invitation`, body `Your account is not attached to a workspace, so there is nothing to show yet. Ask the operator for an invitation, or sign out and use the sample output.`, a `Link href="/demo"` labelled `See sample output`, and the Clerk `UserButton` so the visitor can sign out. Returning here prevents the dashboard page from mounting, which is what stops the 403 calls.

- [ ] **Step 5: Verify**

Run: `cd apps/dashboard; npm test; npx tsc --noEmit; npx eslint src/app/dashboard/layout.tsx src/lib/workspace.ts`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/lib/workspace.ts apps/dashboard/src/lib/workspace.test.ts apps/dashboard/src/app/dashboard/layout.tsx
git commit -m "feat(dashboard): wall a session with no workspace"
```

---

### Task 6: A request that cannot hang forever

**Files:**
- Create: `apps/dashboard/src/lib/http.ts`
- Test: `apps/dashboard/src/lib/http.test.ts`
- Modify: `apps/dashboard/src/lib/jobs.ts:142`
- Modify: `apps/dashboard/src/lib/errors.ts:24-26,54-55`

**Interfaces:**
- Produces: `const REQUEST_TIMEOUT_MS = 75_000`, `function fetchWithTimeout(input: string, init: RequestInit, timeoutMs?: number): Promise<Response>`.

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithTimeout } from "./http.ts";

test("a slow response is aborted instead of hanging", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((_input: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })) as typeof fetch;

  try {
    await assert.rejects(fetchWithTimeout("http://example.test", {}, 10));
  } finally {
    globalThis.fetch = original;
  }
});

test("a normal response passes through", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("ok")) as typeof fetch;
  try {
    const response = await fetchWithTimeout("http://example.test", {}, 1000);
    assert.equal(await response.text(), "ok");
  } finally {
    globalThis.fetch = original;
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/dashboard; node --test "src/lib/http.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `http.ts`**

```ts
/** Free hosting sleeps when idle; a wake-up can take a minute, but not forever. */
export const REQUEST_TIMEOUT_MS = 75_000;

export function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
```

- [ ] **Step 4: Use it in `apiRequest`**

In `jobs.ts`, import `fetchWithTimeout` and replace `return fetch(\`${getApiUrl()}${path}\`, { ...init, headers });` with `return fetchWithTimeout(\`${getApiUrl()}${path}\`, { ...init, headers });`.

- [ ] **Step 5: Rewrite the two messages**

In `errors.ts`, replace `NETWORK_FAILURE` with:

```ts
export const NETWORK_FAILURE =
  "The extraction service did not respond. On free hosting it sleeps when idle, so the first request can take up to a minute. Retry once.";
```

And the `503` branch with:

```ts
    case 503:
      return detail?.trim() ||
        "The service is waking up. Free hosting sleeps when idle, so the first request can take up to a minute. Retry once.";
```

- [ ] **Step 6: Verify**

Run: `cd apps/dashboard; npm test; npx tsc --noEmit; npx eslint src/lib/http.ts src/lib/jobs.ts src/lib/errors.ts`
Expected: pass, 2 new tests.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/lib/http.ts apps/dashboard/src/lib/http.test.ts apps/dashboard/src/lib/jobs.ts apps/dashboard/src/lib/errors.ts
git commit -m "feat(api): time out a sleeping service and explain the wait"
```

---

### Task 7: Public artifacts match the masking rule

**Files:**
- Modify: `docs/assets/sample-leads.csv`
- Modify: `docs/assets/dashboard-desktop.png`, `docs/assets/dashboard-mobile.png`, `docs/assets/email-dialog.png`
- Create: `docs/assets/demo-desktop.png`, `docs/assets/demo-mobile.png`
- Modify: `README.md`

**Interfaces:** none.

**Gate:** do this only after the `docs/portfolio-readme` PR has merged, and branch or rebase so this task is the only README change.

- [ ] **Step 1: Regenerate the sample export**

Write a one-off script (not committed) that imports `DEMO_RUN` from `apps/dashboard/src/lib/demo-run.ts` and `toCsv` from `leads.ts`, writes `docs/assets/sample-leads.csv`, then confirm:

```powershell
Select-String -Path docs/assets/sample-leads.csv -Pattern "@|0707459099"
```

Expected: no output.

- [ ] **Step 2: Retake the screenshots from `/demo`**

Using the browser against the built app, capture `demo-desktop.png` (1440×900) and `demo-mobile.png` (390×844), and replace `dashboard-desktop.png`, `dashboard-mobile.png` and `email-dialog.png` with shots of the same `/demo` page (the dialog shot must show a masked contact row behind it). Keep the existing filenames for the three replacements so the README's image paths still resolve.

- [ ] **Step 3: Update the README**

- Point the dashboard screenshots and the sample export at the demo, with the caption noting contact details are masked.
- Add one line under the overview: `Public sample: /demo — a real run, read-only, no account.` with the URL `https://insight-scraper.vercel.app/demo`.
- Remove any claim that the published CSV is unedited; it is now the same run with phone and email masked.

- [ ] **Step 4: Verify**

```powershell
Select-String -Path README.md -Pattern "Free to sign up|unedited|no editing"
```

Expected: no output. Then open `README.md` and confirm every image path resolves to a file in `docs/assets/`.

- [ ] **Step 5: Commit**

```bash
git add docs/assets README.md
git commit -m "docs: publish masked artifacts and link the sample route"
```

---

## Final verification

```powershell
cd C:\dev\Insight-Scraper\apps\dashboard
npm test
npm run lint
npm run lint:design
npx tsc --noEmit
$env:NEXT_PUBLIC_AUTH_MODE="local"; npm run build
```

Expected: all green; `/demo` in the route list.

Then, with the API stopped: `/demo` serves ten leads, the dialog copies a subject and body, the CSV downloads with `—` in the contact column, and `/` links only to `/demo`, `/pricing`, `/sign-in`.

Backend untouched: `pytest -q -m "not postgres"` from `services/api` must still be `104 passed, 3 deselected`.
