# Insight Scraper — Motion Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Insight Scraper marketing page and authed product around one signature extraction demo and a single enforced design system, with the branding renamed and a real mark.

**Architecture:** Two surfaces. `/` is a marketing page whose hero *performs* a real extraction in DOM and CSS, then hands off to a sign-up. `/dashboard` is an instrument panel: a KPI strip, a three-stage scrape run with a live clock and cancel, and results that resolve in. Both are driven by one token file and one pure-logic module, so the demo and the product cannot drift apart.

**Tech Stack:** Next.js 16.2.6 (app router), React 19.2.4, TypeScript, Tailwind v4 (`@theme` in `globals.css`), `lucide-react`, Clerk, Stripe. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-05-insight-scraper-motion-design.md`

## Global Constraints

- Work in `apps/dashboard/`. Backend touch is exactly one string (`services/api/src/main.py:15`).
- Values, copied verbatim from the spec and Part B. Nothing else is allowed:
  - background `#000000`, surface `#181818`, surface hover `#1F1F1F`, border `#272727`, border strong `#313131`
  - accent `#18A9C2`, accent quiet `rgba(24,169,194,0.12)`
  - attention `#F59E0B`, attention quiet `rgba(245,158,11,0.10)`
  - danger `#F87171`, danger quiet `rgba(248,113,113,0.10)`
  - hero text gradient `#FFFFFF` → `#9B9B9B`, the only gradient in the product
  - motion `cubic-bezier(0.22,1,0.36,1)`, 500ms for movement, 300ms for colour and opacity, never under 200ms
- Animate `transform` and `opacity` only. Never `top`, `left`, `width`, `height`.
- `prefers-reduced-motion: reduce` is honoured by every animation, with no exception.
- Uppercase is chrome only: nav labels, table headers, badges, eyebrows. Headings, buttons and body are sentence case.
- No hyphen inside body copy, headings or labels. Rewrite the phrase.
- `lucide-react` at 1.5px stroke and 20px. Recorded exception, do not migrate.
- Mono is JetBrains Mono, and only on data surfaces: table cells, timings, IDs, the wordmark's second word. Not buttons, not body copy, not labels.
- No glow anywhere except the scan indicator during an active scrape.
- No `rounded-full` anywhere. In Tailwind v4 it is `calc(infinity * 1px)`, not a radius token, so it still renders a circle after the radius scale is zeroed.
- No new dependencies. Removing `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` is required.
- `getToken()`, `orgId`, `DEV_BYPASS_AUTH` and the `Bearer dev_bypass_token` fallback stay byte-compatible.
- `node scripts/design-lint.mjs apps/dashboard` must reach 0 errors, 0 warnings by Task 14.
- Do not rename `POSTGRES_DB: foundry`, `databaseName: foundry`, `user: foundry_user`, or the `db.py` default DSN.

## Review Focus

1. A scrape that finds nothing returns `200` with `{"leads": []}` — the user expects "nothing found", not the error banner.
2. A scrape that runs for minutes — the user expects a live clock and a working Cancel, not a spinner that never resolves.
3. A tenant whose subscription is inactive gets `402` — the user expects "subscription required", not "extraction failed".
4. A lead with `mobile_load_ms` of `0` or missing — the user expects "N/A", not "0 ms".
5. A 60-character business name at 390px — the user expects the card to wrap, not the page to scroll sideways.

---

### Task 1: Branch and deterministic gate

**Files:**
- Modify: `apps/dashboard/package.json`

**Interfaces:**
- Produces: `npm run lint:design` from `apps/dashboard/`, which later tasks run as their gate.

- [ ] **Step 1: Create the branch and commit the scaffolding**

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\Source Code\Insight Scraper"
git checkout main
git pull origin main
git checkout -b design/motion
git add .agents .claude AGENTS.md docs scripts skills-lock.json
git commit -m "chore: add design skills, spec, plan and lint gate"
```

`.agents/`, `.claude/`, `docs/`, `scripts/` and `AGENTS.md` are currently untracked. They must be on the branch before any UI session starts, or every later session runs without its constraints.

- [ ] **Step 2: Add the gate script**

In `apps/dashboard/package.json`, add to `scripts`:

```json
"lint:design": "node scripts/design-lint.mjs src"
```

- [ ] **Step 3: Record the baseline**

Run: `cd apps/dashboard; npm run lint:design`
Expected: exit 1, ending with `design-lint: 23 error(s), 4 warning(s) in src`. Paste the real counts into the commit body.

- [ ] **Step 4: Commit**

```powershell
git add apps/dashboard/package.json
git commit -m "chore(dashboard): add design-lint gate (baseline 23 errors, 4 warnings)"
```

---

### Task 2: Token pass

**Files:**
- Modify: `apps/dashboard/src/app/globals.css` (whole file, 63 lines)

**Interfaces:**
- Produces: every token later tasks reference — `bg-background`, `bg-surface`, `bg-surface-hover`, `border-border`, `border-border-strong`, `text-accent`, `bg-accent`, `text-attention`, `bg-attention-quiet`, `text-danger`, `ease-out-expo`, `duration-move`, `duration-color`, plus the component classes `heading-1`…`heading-6`, `body-3`, `body-5`, `body-6`, `button-md`, `button-sm`, `caption-3`, `caption-4`, `.panel`, `.text-gradient-hero`, `.dot-grid`.

This is the only task allowed to change values.

- [ ] **Step 1: Replace `globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-background: #000000;
  --color-foreground: #FAFAFA;
  --color-surface: #181818;
  --color-surface-hover: #1F1F1F;
  --color-border: #272727;
  --color-border-strong: #313131;

  --color-accent: #18A9C2;
  --color-accent-quiet: rgba(24, 169, 194, 0.12);
  --color-attention: #F59E0B;
  --color-attention-quiet: rgba(245, 158, 11, 0.10);
  --color-danger: #F87171;
  --color-danger-quiet: rgba(248, 113, 113, 0.10);

  --font-sans: var(--font-geist-sans), sans-serif;
  --font-mono: var(--font-jetbrains-mono), monospace;

  --radius-xs: 0px;
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;
  --radius-2xl: 0px;
  --radius-3xl: 0px;
  --radius-full: 0px;

  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-move: 500ms;
  --duration-color: 300ms;

  --shadow-glow: none;
}

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
  }

  table, pre, code {
    font-family: var(--font-mono);
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@layer components {
  .heading-1 { @apply text-6xl font-semibold leading-none; }
  .heading-2 { @apply text-5xl font-semibold leading-none; }
  .heading-3 { @apply text-4xl font-semibold leading-[40px]; }
  .heading-4 { @apply text-3xl font-semibold leading-[36px]; }
  .heading-5 { @apply text-2xl font-semibold leading-[32px]; }
  .heading-6 { @apply text-xl font-semibold leading-[28px]; }

  .body-3 { @apply text-base font-normal leading-6; }
  .body-5 { @apply text-sm font-medium leading-5; }
  .body-6 { @apply text-sm font-normal leading-5; }

  .button-md { @apply text-base font-semibold leading-6; }
  .button-sm { @apply text-sm font-semibold leading-5; }

  .caption-3 { @apply text-xs font-semibold leading-4; }
  .caption-4 { @apply text-xs font-medium leading-4; }

  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
}

@layer utilities {
  .text-gradient-hero {
    background-image: linear-gradient(90deg, #FFFFFF 0%, #9B9B9B 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .dot-grid {
    background-image: radial-gradient(rgba(250, 250, 250, 0.05) 1px, transparent 1px);
    background-size: 24px 24px;
  }
}
```

Three deletions matter as much as the additions: the `* { border-radius: 0 !important }` rule, the global `text-transform: uppercase`, and `input, button` being forced to mono.

`--font-display` is deliberately not carried over. Surfaces still using `font-display` will fall back to the sans stack until their own task rewrites them; do not add the token back to silence that.

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/dashboard; npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Verify the gate moved**

Run: `npm run lint:design`
Expected: error count strictly lower than 23. Paste the new counts.

- [ ] **Step 4: Commit**

```powershell
git add apps/dashboard/src/app/globals.css
git commit -m "feat(dashboard): replace design tokens with the approved system"
```

---

### Task 3: Logo and rename

**Files:**
- Create: `apps/dashboard/src/components/Logo.tsx`
- Create: `apps/dashboard/public/mark.svg`, `mark-mono.svg`, `wordmark.svg`
- Create: `apps/dashboard/src/app/icon.svg`
- Delete: `apps/dashboard/src/app/favicon.ico`
- Modify: `apps/dashboard/src/app/page.tsx:12-27`, `apps/dashboard/src/app/dashboard/layout.tsx:24-31`, `services/api/src/main.py:15`, `README.md`, `CONTRIBUTING.md`

**Interfaces:**
- Produces: `Logo({ variant, size }: { variant?: "full" | "mark"; size?: number }): React.ReactElement` — markup only, no link. Callers wrap it.

- [ ] **Step 1: Read the file convention docs**

Read `apps/dashboard/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` and `.../opengraph-image.md`. Confirm `src/app/icon.svg` is the supported name in 16.2.6, that removing `favicon.ico` does not break the route, and the exact export signature for `opengraph-image.tsx`.

- [ ] **Step 2: Create the mark**

`apps/dashboard/public/mark.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#18A9C2" stroke-width="1.5" stroke-linecap="square">
  <path d="M9 4 H5 V20 H9" />
  <path d="M15 4 H19 V20 H15" />
  <rect x="10" y="2.5" width="4" height="4" fill="#18A9C2" stroke="none" />
</svg>
```

`mark-mono.svg` is the same file with `stroke="#FAFAFA"` and `fill="#FAFAFA"`.

- [ ] **Step 3: Create the wordmark and favicon**

`public/wordmark.svg`: `INSIGHT` in Geist semibold and `SCRAPER` in JetBrains Mono medium, baseline aligned, 1px gap, foreground `#FAFAFA`. Convert the two words to paths so the file renders without a webfont.

`src/app/icon.svg`: the bracket mark, 32×32 viewBox, accent on `#000000`.

- [ ] **Step 4: Create `Logo.tsx`**

```tsx
import Image from "next/image";

export function Logo({ variant = "full", size = 32 }: { variant?: "full" | "mark"; size?: number }) {
  if (variant === "mark") {
    return <Image src="/mark.svg" alt="Insight Scraper" width={size} height={size} unoptimized priority />;
  }
  return (
    <span className="flex items-center gap-3">
      <Image src="/mark.svg" alt="" width={size} height={size} unoptimized priority />
      <span className="heading-6 text-foreground">
        <span className="font-semibold">INSIGHT</span>
        <span className="font-mono font-medium"> SCRAPER</span>
      </span>
    </span>
  );
}
```

- [ ] **Step 5: Replace both glyph lockups**

In `page.tsx`, replace the `Database` glyph block and the `Foundry-SaaS` span (lines 13-18) with `<Logo />`. In `dashboard/layout.tsx`, replace lines 25-30 with `<Logo size={28} />`.

In `services/api/src/main.py:15`, change the FastAPI title to `"Insight Scraper API"`. In `README.md` and `CONTRIBUTING.md`, replace every `Foundry-SaaS` with `Insight Scraper`.

- [ ] **Step 6: Add the social image**

Create `apps/dashboard/src/app/opengraph-image.tsx` with `size = { width: 1200, height: 630 }`, `contentType = "image/png"`, and a default export that renders on `#000000`: the bracket mark, the wordmark, and one line — `Every lead on the page, with the pitch already written.` Use `ImageResponse` from `next/og`. No gradient, no glow, no external fetch.

Then set `metadata.openGraph` and `metadata.twitter` in `src/app/layout.tsx` so the image is actually referenced.

- [ ] **Step 7: Verify the rename is complete and the identifiers survived**

```powershell
Get-ChildItem -Recurse -File -Include *.tsx,*.ts,*.md,*.py -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "node_modules|\.next|package-lock" } |
  Select-String -Pattern "foundry-saas" -SimpleMatch
```

Expected: no output.

```powershell
Select-String -Path docker-compose.yml,render.yaml -Pattern "POSTGRES_DB|databaseName|foundry_user"
```

Expected: `foundry` and `foundry_user` still present and unchanged.

- [ ] **Step 8: Commit**

```powershell
git add apps/dashboard/public apps/dashboard/src/app/icon.svg apps/dashboard/src/app/opengraph-image.tsx apps/dashboard/src/app/layout.tsx apps/dashboard/src/components/Logo.tsx apps/dashboard/src/app/page.tsx apps/dashboard/src/app/dashboard/layout.tsx services/api/src/main.py README.md CONTRIBUTING.md
git rm apps/dashboard/src/app/favicon.ico
git commit -m "feat: add extraction bracket mark, social image and rename display strings"
```

---

### Task 4: Pure lead logic with tests

**Files:**
- Create: `apps/dashboard/src/lib/leads.ts`
- Create: `apps/dashboard/src/lib/leads.test.ts`
- Modify: `apps/dashboard/src/app/dashboard/page.tsx:8-97` (delete the inline helpers), `apps/dashboard/package.json`, `apps/dashboard/tsconfig.json`

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/lib/leads.ts`:

```ts
export interface LeadItem { /* the existing shape, moved unchanged from dashboard/page.tsx:8-41 */ }

export const SLOW_LOAD_MS = 3000;
export const SPEED_PITCH = "Pitch $750 Speed Overhaul (#2)";
export const RAG_PITCH = "Pitch $1,000 RAG Bot (#4)";
export const QUALIFIED_PITCH = "Qualified Enterprise AI Lead";

export type PitchTone = "attention" | "accent" | "neutral";

export function getMobileLoadMs(lead: LeadItem): number;
export function getHasChatbot(lead: LeadItem): boolean;
export function getPitchHook(lead: LeadItem): string;
export function pitchTone(pitch: string): PitchTone;

export interface Kpis {
  total: number;
  meanLoadMs: number | null;
  withoutChatbot: number;
  withoutChatbotPct: number;
  markets: number;
}
export function computeKpis(leads: LeadItem[]): Kpis;

export function toCsv(leads: LeadItem[], fallback: { region: string; query: string }): string;
```

- [ ] **Step 1: Write the failing tests**

`src/lib/leads.test.ts` — import with the `.ts` extension, which Node's type stripping requires:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  SLOW_LOAD_MS, SPEED_PITCH, RAG_PITCH, QUALIFIED_PITCH,
  getMobileLoadMs, getHasChatbot, getPitchHook, pitchTone, computeKpis, toCsv,
} from "./leads.ts";

test("load of exactly 3000ms is not slow", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 3000, has_chatbot_widget: true }), QUALIFIED_PITCH);
  assert.equal(getPitchHook({ mobile_load_ms: 3001, has_chatbot_widget: true }), SPEED_PITCH);
});

test("speed pitch wins over the chatbot pitch", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 5000, has_chatbot_widget: false }), SPEED_PITCH);
});

test("missing chatbot with a fast site is the RAG pitch", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 1800, has_chatbot_widget: false }), RAG_PITCH);
});

test("an explicit pitch hook from the API is never overridden", () => {
  assert.equal(getPitchHook({ mobile_load_ms: 9000, pitch_hook: "Custom" }), "Custom");
});

test("capitalised API keys are read", () => {
  assert.equal(getMobileLoadMs({ "Mobile_Load_Ms": 2100 }), 2100);
  assert.equal(getHasChatbot({ "Has_Chatbot_Widget": true }), true);
});

test("an unmeasured load reads as 0, never NaN", () => {
  assert.equal(getMobileLoadMs({}), 0);
  assert.equal(getMobileLoadMs({ mobile_load_ms: undefined }), 0);
});

test("pitch tone maps to the three signal states", () => {
  assert.equal(pitchTone(SPEED_PITCH), "attention");
  assert.equal(pitchTone(RAG_PITCH), "accent");
  assert.equal(pitchTone(QUALIFIED_PITCH), "neutral");
});

test("mean load ignores unmeasured leads", () => {
  const k = computeKpis([{ mobile_load_ms: 2000 }, { mobile_load_ms: 4000 }, { mobile_load_ms: 0 }]);
  assert.equal(k.meanLoadMs, 3000);
  assert.equal(k.total, 3);
});

test("mean load is null when nothing was measured", () => {
  assert.equal(computeKpis([{ mobile_load_ms: 0 }]).meanLoadMs, null);
});

test("chatbot share is a rounded percentage of the loaded set", () => {
  const k = computeKpis([
    { has_chatbot_widget: true }, { has_chatbot_widget: false }, { has_chatbot_widget: false },
  ]);
  assert.equal(k.withoutChatbot, 2);
  assert.equal(k.withoutChatbotPct, 67);
});

test("markets counts distinct non-empty regions", () => {
  const k = computeKpis([{ region: "US" }, { region: "US" }, { region: "GB" }, {}]);
  assert.equal(k.markets, 2);
});

test("csv quotes, escapes and falls back", () => {
  const csv = toCsv(
    [{ business_name: 'Cedar "North" Spa', phone: undefined }],
    { region: "US", query: "medspas in Austin, TX" },
  );
  const lines = csv.split("\r\n");
  assert.ok(lines[0].startsWith('"Business Name","Phone"'));
  assert.ok(lines[1].includes('"Cedar ""North"" Spa"'));
  assert.ok(lines[1].includes('"Hidden"'));
  assert.ok(lines[1].includes('"medspas in Austin, TX"'));
});
```

- [ ] **Step 2: Run them and watch them fail**

Add `"test": "node --test src/lib"` to `apps/dashboard/package.json` scripts.

Add `"allowImportingTsExtensions": true` to `compilerOptions` in `apps/dashboard/tsconfig.json`. Node's type stripping requires the `.ts` extension on the import; TypeScript rejects that extension without this flag. This is the same setting ClearGig ships.

Then run `cd apps/dashboard; npm test`.
Expected: FAIL, `Cannot find module './leads.ts'`.

- [ ] **Step 3: Implement `src/lib/leads.ts`**

Move `LeadItem` and the three helper bodies out of `dashboard/page.tsx` unchanged, then add `pitchTone`, `computeKpis` and `toCsv`. `computeKpis` averages only `getMobileLoadMs(lead) > 0`, returns `null` when none qualify, rounds the percentage with `Math.round`, and counts `new Set` of non-empty `region` values. `toCsv` produces the same 12 headers and CRLF joining as `dashboard/page.tsx:137-184`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test; npx tsc --noEmit`
Expected: 12 passing, 0 failing, tsc silent.

- [ ] **Step 5: Commit**

```powershell
git add apps/dashboard/src/lib/leads.ts apps/dashboard/src/lib/leads.test.ts apps/dashboard/package.json apps/dashboard/tsconfig.json
git commit -m "refactor(dashboard): extract lead signals, KPIs and CSV into tested pure functions"
```

---

### Task 5: Remove the 3D layer

**Files:**
- Delete: `apps/dashboard/src/components/HeroScene.tsx`
- Modify: `apps/dashboard/src/app/page.tsx:3,9`, `apps/dashboard/package.json`, `apps/dashboard/package-lock.json`

**Interfaces:**
- Produces: a landing page with no `HeroScene` and no `three` in the bundle. Task 6 fills the empty hero slot.

- [ ] **Step 1: Record the before size**

Run: `cd apps/dashboard; npm run build`
Copy the "First Load JS" number for `/` from the output into the commit body.

- [ ] **Step 2: Remove the component and the import**

Delete `src/components/HeroScene.tsx`. In `src/app/page.tsx`, delete the import on line 3 and the `<HeroScene />` call on line 9.

- [ ] **Step 3: Remove the dependencies**

Run: `cd apps/dashboard; npm uninstall three @react-three/fiber @react-three/drei @types/three`
Expected: the four entries are gone from `package.json`, `package-lock.json` updated.

- [ ] **Step 4: Rebuild and compare**

Run: `npm run build`
Expected: passes; the `/` First Load JS figure is materially smaller than Step 1. If it is not, stop and report the two numbers.

- [ ] **Step 5: Commit**

```powershell
git add apps/dashboard/src/app/page.tsx apps/dashboard/package.json apps/dashboard/package-lock.json
git rm apps/dashboard/src/components/HeroScene.tsx
git commit -m "perf(dashboard): remove three.js hero (First Load JS /: X kB -> Y kB)"
```

---

### Task 6: The signature moment

**Files:**
- Create: `apps/dashboard/src/components/ExtractionDemo.tsx`
- Create: `apps/dashboard/src/lib/demo-data.ts`
- Modify: `apps/dashboard/src/app/page.tsx` (hero slot)

**Interfaces:**
- Consumes: `getPitchHook`, `pitchTone`, `LeadItem` from `src/lib/leads.ts`.
- Produces:
  - `src/lib/demo-data.ts`: `DEMO_QUERY: string`, `DEMO_REGION: string`, `DEMO_SOURCE: string`, `DEMO_STAGES: readonly string[]`, `DEMO_LEADS: readonly DemoLead[]`, `interface DemoLead { name: string; region: string; phone: string; website: string; loadMs: number; hasChatbot: boolean }`
  - `src/components/ExtractionDemo.tsx`: `ExtractionDemo({ variant }: { variant?: "hero" | "sample" }): React.ReactElement`

- [ ] **Step 1: Write the demo data**

Five rows, invented names that sound like Austin medspas, `512-555-01xx` phone numbers, invented domains, non-round load times so both pitch branches appear:

| name | loadMs | hasChatbot | expected pitch |
|---|---|---|---|
| Cedar North Aesthetics | 4317 | true | speed |
| Barton Creek Skin Studio | 1842 | true | qualified |
| Lone Star Laser Collective | 6120 | false | speed |
| Verde Wellness ATX | 2905 | false | RAG |
| Mesa Med Spa Group | 3688 | true | speed |

`DEMO_QUERY = "medspas in Austin, TX"`, `DEMO_REGION = "US"`, `DEMO_SOURCE = "Google Maps"`, `DEMO_STAGES = ["Queued", "Fetching 1/3", "Fetching 3/3", "Parsing", "Enriching", "Done"]`.

- [ ] **Step 2: Build the component**

Client component. Sequence exactly as the spec's §5.3: type the query at 40ms per character, accent the region then source chip, advance the six stages at 450ms, enter five rows 120ms apart with `opacity 0→1` and `translateY(8px)→0`, grow each load bar `scaleX(0)→1` over 500ms, flip the chatbot chip, then reveal pitch badges 60ms apart at `scale(0.98)→1`, then tick the counter `0→25` over 600ms with `tabular-nums`.

Rules that are not negotiable:

- Start on first `IntersectionObserver` intersection, not on mount.
- Replay at most twice automatically, then hold the final state. A text `Replay` button re-runs it on demand.
- `prefers-reduced-motion: reduce` renders the final state immediately, with no timers at all.
- All timers cleared on unmount.
- The panel is `position: sticky` for the hero variant only; no `window.addEventListener("scroll")` anywhere.
- Bars use `transform: scaleX()`, never `width`.

- [ ] **Step 3: Mount it in the hero**

In `src/app/page.tsx`, replace the hero's empty slot with `<ExtractionDemo />` over a `dot-grid` background. Keep the hero heading and subheading above it.

- [ ] **Step 4: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design`
Expected: tsc silent, no new `scroll-listener` or `default-ease` findings.

Then in the browser with reduced motion forced, confirm the panel shows the completed table immediately and the counter reads 25.

- [ ] **Step 5: Commit**

```powershell
git add apps/dashboard/src/components/ExtractionDemo.tsx apps/dashboard/src/lib/demo-data.ts apps/dashboard/src/app/page.tsx
git commit -m "feat(landing): add the live extraction demo"
```

---

### Task 7: Landing page

**Files:**
- Modify: `apps/dashboard/src/app/page.tsx` (full rewrite)
- Create: `apps/dashboard/src/components/TaglineReveal.tsx`
- Create: `apps/dashboard/src/components/SiteFooter.tsx`
- Create: `apps/dashboard/src/components/FaqList.tsx`

**Interfaces:**
- Consumes: `ExtractionDemo` (Task 6), `Logo` (Task 3).
- Produces: `TaglineReveal({ lines }: { lines: string[] }): React.ReactElement`, `SiteFooter(): React.ReactElement`, `FaqList({ items }: { items: { q: string; a: string }[] }): React.ReactElement`.

- [ ] **Step 1: Build `TaglineReveal`**

Words start at 30% opacity and reach full colour one at a time in reading order, triggered per word by an `IntersectionObserver` on the word, not on the section. Under reduced motion, render full colour immediately.

- [ ] **Step 2: Build `SiteFooter` and `FaqList`**

Footer: `<Logo size={24} />`, links to `/pricing` and `/sign-in`, and a copyright line. No `href="#"`.

`FaqList`: six question and answer pairs, plain `<dl>` semantics, sentence case, no hyphens in the copy.

- [ ] **Step 3: Rebuild `page.tsx` in the spec's order**

Hero (heading, subheading, primary CTA to `/sign-up`, `Free to sign up. Cancel anytime.`, `<ExtractionDemo />`) → tagline reveal → how it works (three sources) → benefits as a two column zig zag, not three cards → signals (the real 3000ms and no-chatbot thresholds) → FAQ → final CTA → footer.

Heading: `Every lead on the page, with the pitch already written.`
Subheading: `Pull local businesses from Google Maps, DuckDuckGo and Yellow Pages across six markets. We check their mobile speed and chatbot, then tell you which service to sell them.`
Primary CTA: `Run a sample extraction`.
Secondary: `See pricing` as a text link.

No invented testimonials, logos or statistics. If a proof slot is wanted, render `{{testimonial}}` verbatim.

- [ ] **Step 4: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design; npm run build`
Expected: tsc silent, lint clean for `page.tsx` and the three new components, build passes.

At 390px, confirm the primary CTA is visible without scrolling and the page does not scroll horizontally.

- [ ] **Step 5: Commit**

```powershell
git add apps/dashboard/src/app/page.tsx apps/dashboard/src/components/TaglineReveal.tsx apps/dashboard/src/components/SiteFooter.tsx apps/dashboard/src/components/FaqList.tsx
git commit -m "feat(landing): rebuild the marketing page around the demo"
```

---

### Task 8: Public pricing

**Files:**
- Create: `apps/dashboard/src/app/pricing/page.tsx`
- Create: `apps/dashboard/src/components/PriceTier.tsx`

**Interfaces:**
- Produces: `PriceTier({ name, price, period, description, features, featured }: { name: string; price: string; period?: string; description: string; features: string[]; featured?: boolean }): React.ReactElement`

- [ ] **Step 1: Build `PriceTier`**

Flat `panel`, one accent, hard corners, sentence case, a square badge for the featured tier. No `bg-gradient-*`, no `scale-105`, no glow.

- [ ] **Step 2: Build the route**

Two tiers only, copied from `dashboard/billing/page.tsx`: Pro at `$49` per month with its five features, Enterprise at `Custom` with its five. CTA on both goes to `/sign-up`. No checkout call on this page.

`middleware.ts` already protects only `/dashboard(.*)`, so `/pricing` is public with no change.

- [ ] **Step 3: Verify**

Run: `cd apps/dashboard; npm run build`
Expected: passes and lists `/pricing` as a static route.

Open `/pricing` signed out: it renders, and both CTAs land on `/sign-up`.

- [ ] **Step 4: Commit**

```powershell
git add apps/dashboard/src/app/pricing/page.tsx apps/dashboard/src/components/PriceTier.tsx
git commit -m "feat(landing): add public pricing page"
```

---

### Task 9: Dashboard shell

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/layout.tsx` (full rewrite)
- Create: `apps/dashboard/src/app/dashboard/template.tsx`
- Create: `apps/dashboard/src/components/SidebarNav.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 3).
- Produces: `SidebarNav({ onNavigate }: { onNavigate?: () => void }): React.ReactElement`, and a `<main id="main">` that the skip link targets.

- [ ] **Step 1: Read the template convention**

Read `apps/dashboard/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/template.md`. Confirm the export name and that a `template.tsx` in `dashboard/` applies to nested routes.

- [ ] **Step 2: Build `SidebarNav`**

Same five destinations and icons. Active item: `bg-accent-quiet text-accent` plus a 2px accent bar flush to the left edge. No glow. Sentence case labels.

- [ ] **Step 3: Rebuild the layout**

- `<a href="#main" className="sr-only focus:not-sr-only ...">Skip to content</a>` as the first child.
- Sidebar visible at `lg` and above. Below `lg`, a top bar with a menu button opening a full height slide-over panel; links stagger in 60ms apart on the base curve; the toggle icon animates between the two states.
- Escape closes the drawer and returns focus to the menu button.
- Header keeps `OrganizationSwitcher` and `UserButton` with `borderRadius: 0` and no glow.
- `<main id="main">` wraps the scrolling content.

- [ ] **Step 4: Add the route transition**

`src/app/dashboard/template.tsx` — a client component that enters with `opacity 0→1` and `translateY(8px)→0` over 300ms on `ease-out-expo`, and renders the final state immediately under reduced motion.

- [ ] **Step 5: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design`
Then check at 1440, 1024, 768 and 390: no horizontal overflow, drawer opens and closes, focus visible on every stop, skip link works.

- [ ] **Step 6: Commit**

```powershell
git add apps/dashboard/src/app/dashboard/layout.tsx apps/dashboard/src/app/dashboard/template.tsx apps/dashboard/src/components/SidebarNav.tsx
git commit -m "feat(dashboard): responsive shell with slide-over nav and route transitions"
```

---

### Task 10: Scrape state machine and KPIs

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/page.tsx` (state and handlers only)
- Create: `apps/dashboard/src/components/ScrapeStatus.tsx`
- Create: `apps/dashboard/src/components/KpiStrip.tsx`

**Interfaces:**
- Consumes: `computeKpis`, `LeadItem` (Task 4).
- Produces:
  - `ScrapeStatus({ state, onCancel }: { state: ScrapeState; onCancel: () => void }): React.ReactElement`
  - `KpiStrip({ leads }: { leads: LeadItem[] }): React.ReactElement`
  - `type ScrapeState = { phase: "idle" } | { phase: "running"; startedAt: number } | { phase: "done"; count: number } | { phase: "empty" } | { phase: "error"; message: string }`

- [ ] **Step 1: Replace the scrape state**

Delete `isScraping` and the `alert()` at line 251. Use `ScrapeState`, an `AbortController` held in a ref, and `fetch(url, { signal })`. `onCancel` aborts and returns to `idle`.

Map responses to phases:

| Response | Phase |
|---|---|
| `ok`, `leads.length > 0` | `done` |
| `ok`, `leads.length === 0` | `empty` |
| `402` | `error` — `"Your subscription is not active. Open Billing to choose a plan."` |
| `403` | `error` — `"You do not have access to this workspace."` |
| `5xx` or network throw | `error` — `"Could not reach the extraction service. Check that the backend is running, then try again."` |
| anything else | `error` — `"Extraction failed. Try a different query or region."` |

- [ ] **Step 2: Replace the initial fetch failure**

The `catch` at line 123 currently logs and shows nothing. Set a `loadError` string instead, and render a panel with the same message and a `Try again` button that re-runs the fetch.

- [ ] **Step 3: Build `ScrapeStatus`**

Three stages: `Queued`, `Extracting` with a live elapsed clock (`0:04`, `1:12`) updating once per second, `Done`. Past 20 seconds, swap the clock line for an indeterminate activity line so a long run does not read as stalled. `Cancel` is a text button, visible only while running. The scan indicator is the single element in the product allowed a luminous treatment. Under reduced motion, no pulse.

- [ ] **Step 4: Build `KpiStrip`**

Four figures from `computeKpis`: leads found, mean mobile load (`null` renders `N/A`), share without a chatbot, markets covered. Label the strip `Across the leads shown`. Count up over 400ms on change; under reduced motion, render final values.

- [ ] **Step 5: Verify the four failure paths**

Run the dev server and, with the backend stopped, start a scrape: expect the network message, no `alert()`, no spinner. Start the backend, run a nonsense query: expect `empty`, not `error`. With a lead-less response body: `empty`. Confirm `Cancel` stops the request.

Run: `npm run lint:design` — no `window-alert` findings remain.

- [ ] **Step 6: Commit**

```powershell
git add apps/dashboard/src/app/dashboard/page.tsx apps/dashboard/src/components/ScrapeStatus.tsx apps/dashboard/src/components/KpiStrip.tsx
git commit -m "feat(dashboard): honest scrape states, live clock and KPI strip"
```

---

### Task 11: Results table and mobile cards

**Files:**
- Create: `apps/dashboard/src/components/LeadResults.tsx`
- Modify: `apps/dashboard/src/app/dashboard/page.tsx` (results region only)

**Interfaces:**
- Consumes: `getPitchHook`, `getMobileLoadMs`, `getHasChatbot`, `pitchTone`, `LeadItem` (Task 4).
- Produces: `LeadResults({ leads, region }: { leads: LeadItem[]; region: string }): React.ReactElement`

- [ ] **Step 1: Build `LeadResults`**

One component, two renders: `<table className="hidden lg:table">` with the existing seven columns, and `<ul className="lg:hidden">` of cards. Each card: name plus region badge, a two column signal grid (mobile load, chatbot), the pitch badge, then the website link. Every field labelled. Long names wrap; nothing truncates to an ellipsis on mobile.

Signal encoding per the spec, no third hue: slow load is `text-attention`, fast load is full weight foreground with `tabular-nums`, chatbot present is a `border-border` outline chip, chatbot absent is an accent chip.

Rows resolve in with a 40ms stagger capped at 12 rows, then render instantly. Under reduced motion, no stagger.

- [ ] **Step 2: Remove the old markup**

Delete the inline table (lines 387-515) from `dashboard/page.tsx` and render `<LeadResults leads={leads} region={region} />`. Keep the empty state in the page, using the `empty` phase copy.

- [ ] **Step 3: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design`
At 390px with a 60 character business name, confirm the card wraps and the page does not scroll sideways. At 1024px, confirm the table renders and no column is clipped.

- [ ] **Step 4: Commit**

```powershell
git add apps/dashboard/src/components/LeadResults.tsx apps/dashboard/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): responsive results table with mobile lead cards"
```

---

### Task 12: Billing, settings, history and the pricing redirect

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/billing/page.tsx` (full rewrite)
- Modify: `apps/dashboard/src/app/dashboard/settings/page.tsx` (full rewrite)
- Modify: `apps/dashboard/src/app/dashboard/history/page.tsx`
- Delete: `apps/dashboard/src/app/dashboard/pricing/page.tsx`, `apps/dashboard/src/components/PricingCard.tsx`
- Modify: `apps/dashboard/next.config.ts`

**Interfaces:**
- Consumes: `PriceTier` (Task 8).
- Produces: `/dashboard/pricing` redirects to `/dashboard/billing` at the config level.

- [ ] **Step 1: Redirect, then delete**

In `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/dashboard/pricing", destination: "/dashboard/billing", permanent: true }];
  },
};
```

Delete `src/app/dashboard/pricing/page.tsx` and `src/components/PricingCard.tsx`.

- [ ] **Step 2: Rebuild billing**

Keep `handleSubscribe` and the `orgId` gate byte-identical. Replace the indigo/violet surfaces with `PriceTier` for the two tiers, keep the org-required notice, and keep the Stripe error banner using `text-danger` and `bg-danger-quiet`. No `bg-gradient-*`, no `rounded-full`, no glow.

- [ ] **Step 3: Replace the dead settings controls**

Remove the Save button and the four tab buttons with no handlers. Render a single panel: `Settings are not available in this build.` Keep the read-only email field, or remove it; do not leave an input that appears editable and is not.

- [ ] **Step 4: Fix history**

Replace the static empty state with the same honest panel used on settings: `History is not available in this build.` Restyle to tokens, sentence case, and remove the `font-display` class, which no longer exists.

- [ ] **Step 5: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design`
Then: `curl -I http://localhost:3000/dashboard/pricing` while signed in — expect a 308 to `/dashboard/billing`. Confirm the placeholder price IDs are gone:

```powershell
Get-ChildItem -Recurse -File -Include *.tsx,*.ts apps/dashboard/src |
  Select-String -Pattern "price_basic_123","price_pro_456"
```

Expected: no output.

- [ ] **Step 6: Commit**

```powershell
git add apps/dashboard/next.config.ts apps/dashboard/src/app/dashboard/billing/page.tsx apps/dashboard/src/app/dashboard/settings/page.tsx apps/dashboard/src/app/dashboard/history/page.tsx
git rm apps/dashboard/src/app/dashboard/pricing/page.tsx apps/dashboard/src/components/PricingCard.tsx
git commit -m "fix(dashboard): repair billing surfaces and redirect the broken pricing route"
```

---

### Task 13: Clerk surfaces

**Files:**
- Create: `apps/dashboard/src/lib/clerk-appearance.ts`
- Modify: `apps/dashboard/src/app/sign-in/[[...sign-in]]/page.tsx`, `apps/dashboard/src/app/sign-up/[[...sign-up]]/page.tsx`

**Interfaces:**
- Produces: `clerkAppearance: { variables: {...}; elements: {...} }`, imported by both pages.

- [ ] **Step 1: Extract one appearance object**

`variables`: `colorPrimary: "#18A9C2"`, `colorBackground: "#181818"`, `colorText: "#FAFAFA"`, `colorTextSecondary: "#9B9B9B"`, `colorInputBackground: "#1F1F1F"`, `borderRadius: "0px"`, `fontFamily: "var(--font-geist-sans)"`, `fontFamilyButtons: "var(--font-geist-sans)"`.

`elements`: flat card, `boxShadow: "none"`, one border, square buttons, no uppercase transforms.

- [ ] **Step 2: Strip the theatre and the glow**

Remove `SECURE_LOGIN_TERMINAL //` and `SYS_STATUS: ONLINE`. Remove `shadow-glow` from the wrapper. Keep the centered layout and the mark.

- [ ] **Step 3: Verify**

Run: `cd apps/dashboard; npx tsc --noEmit; npm run lint:design`
Open `/sign-in` and `/sign-up`: no glow, no uppercase Clerk headings, focus ring visible on the form button, radius 0 on card and inputs.

- [ ] **Step 4: Commit**

```powershell
git add apps/dashboard/src/lib/clerk-appearance.ts apps/dashboard/src/app/sign-in apps/dashboard/src/app/sign-up
git commit -m "feat(auth): apply the design system to the Clerk surfaces"
```

---

### Task 14: Gate and handoff

**Files:**
- Modify: `docs/design-prompts/README.md` (only if a task changed during execution)

**Interfaces:**
- Consumes: every task above.

- [ ] **Step 1: Run the full gate**

```powershell
cd apps/dashboard
npx tsc --noEmit
npm test
npm run lint:design
npm run build
```

Expected: all four exit 0; `design-lint: clean (src)`.

- [ ] **Step 2: Run the visual and keyboard checks**

At 1920, 1440, 1024, 768 and 390: no horizontal overflow, nothing clipped. Tab through `/`, the sidebar, the action bar, the results, and billing — focus visible on every stop. With reduced motion forced, the demo is silent, the tagline is fully lit, and nothing moves.

Console clean on `/`, `/pricing`, `/dashboard`, `/dashboard/billing`, `/sign-in`: no errors, no 404s, no CDN fetches.

- [ ] **Step 3: Draft the PR body**

What changed, why, before and after screenshots, the design-lint output, the bundle delta from Task 5, and the three owner decisions recorded in the spec's §9. Do not merge, do not push to `main`.

- [ ] **Step 4: Reconcile the prompt pack**

`docs/design-prompts/README.md` was written against this plan. Diff the two: every task number, file path and gate command must still match. Update the pack where execution diverged, then commit only if it changed.
