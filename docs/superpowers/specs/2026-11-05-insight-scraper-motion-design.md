# Insight Scraper — motion and craft redesign

Date: 2026-11-05
Status: draft, awaiting approval
Supersedes: none
Design authority: `AGENTS.md` (layer table), `landing-page-design` Part B (values)

---

## 1. Why

The product is a B2B lead scraper: it pulls businesses from Google Maps,
DuckDuckGo Places and Yellow Pages across six markets, measures their mobile
load time, detects chatbot widgets, and assigns a pitch hook. It is sold at
$49/month, gated by Clerk, billed through Stripe.

The brief is **not** a new colour scheme. The brief is that the interface should
feel expensive and convincing enough to raise conversion, using motion and
transitions, without landing in the generic AI-generated look.

Two facts drive the whole design:

1. **The most persuasive thing in this product is the scrape itself.** The only
   objection that matters is "what do I actually get?" Motion that answers that
   converts. Motion that decorates does not.
2. **The app is already trying to look distinctive and failing for mechanical
   reasons**, not aesthetic ones. See §3.

---

## 2. Goals, non-goals, anti-goals

### Goals

- Make `/` demonstrate a real extraction rather than describe one.
- Make the authed product feel like instrumented software, not a template.
- Remove the visual collision between three competing design languages.
- Give the product a real name and a real mark.
- Hold 390px without horizontal scroll, including the 7-column table.
- Pass `node scripts/design-lint.mjs apps/dashboard` with zero errors.

### Non-goals

- Changing the business model, pricing, or Stripe flow.
- Rewriting the FastAPI backend beyond the one display string in §6.
- Adding a CMS, blog, docs site, or marketing funnel.
- Winning an Awwwards. This is a product, not an agency portfolio.

### Anti-goals

- Scroll-jacking or scroll-linked motion behind auth.
- A cinematic hero **video**. It is the wrong tool for a data product and the
  fastest way to a 4 MB first paint.
- Invented testimonials, invented customer logos, invented statistics. There is
  no social proof in this product today, so §5 uses marked placeholders.
- A moodboard of ten effects. One signature moment, done properly.

---

## 3. Diagnosis — what is actually wrong

Baseline: `node scripts/design-lint.mjs apps/dashboard` → **23 errors, 4 warnings**.
8 of the 23 are `transition-all`.

### 3.1 The collision (the main problem)

`src/app/globals.css` declares a coherent system — obsidian base, electric cyan,
hard corners, uppercase headings, mono for data. Then it enforces two rules
globally with `!important`:

```css
* { border-radius: 0 !important; }        /* line 33 */
h1,h2,h3,h4,h5,h6 { text-transform: uppercase; }  /* line 44 */
```

Three surfaces are written in a **different** language that those rules silently
destroy:

| File | Its own language | What actually renders |
|---|---|---|
| `dashboard/billing/page.tsx` | indigo/violet, `rounded-2xl`, `rounded-full`, gradient headline, soft shadows | square indigo cards, uppercase gradient headline |
| `dashboard/settings/page.tsx` | `rounded-xl`, indigo, `backdrop-blur`, hardcoded indigo shadow | square indigo cards |
| `components/PricingCard.tsx` | white cards, `rounded-3xl`, indigo, `scale-105` | square white cards on a dark page |

This is not "three designs". It is **one design being corrupted by a global
override**, which is why the result reads as broken rather than as a choice.

### 3.2 The 3D hero is invisible and expensive

`components/HeroScene.tsx` renders an icosahedron with `color="#09090b"` on a
`#09090b` background — a wireframe of the same colour as the page, visible only
as cyan edges. It ships `three`, `@react-three/fiber`, `@react-three/drei` and
`@types/three` to do it, and `<Environment preset="city" />` fetches an HDR
environment map from a CDN at runtime.

The app already has the 3D background the brief asks for, and it is both
barely visible and the single heaviest thing on the page.

### 3.3 Slop inventory

Checked against the ten most recognisable tells: indigo gradient on dark,
glassmorphism, floating orbs, gradient "Most Popular" pill, generic 3D blob,
emoji icons in selects, `transition-all`, centred hero with gradient headline,
fake stat row, fade-up on every section.

Present today: **7 of 10**.

### 3.4 Other concrete findings

- `table` at 390px is `overflow-x-auto` only. Seven columns, no responsive
  strategy.
- `alert()` on scrape failure (`dashboard/page.tsx:251`) and in `PricingCard`.
- Initial leads fetch swallows errors with `console.warn` (line 123), so
  "backend down" renders identically to "no leads yet".
- `shadow-glow` is applied in 6+ places. Glow on everything is the loudest
  tell in the file.
- `--color-success-*` is amber, used for the "Extracted" badge. Amber reads as
  warning.
- Background (`#09090b`) is lighter than surface (`#000000`), so panels read as
  holes rather than elevation.
- Copy is sci-fi theatre aimed at an audience of agency owners: "Initialize
  Sequence", "View Schematics", "Absolute Isolation", "unauthorized nodes",
  "Extraction Engine Active".
- `layout.tsx` sets the browser title to "Insight Scraper" while the page header
  reads "Foundry-SaaS". The tab and the page disagree.
- `settings` and `history` are presentational stubs with no data binding.
  Out of scope to fix; in scope to stop lying visually.

---

## 4. Approaches considered

**A. Live crawl — the landing page performs an extraction.** Hero is a real
extraction playing out: query types, status steps advance, rows resolve, signals
flip, counter ticks. Scroll pins the panel while the story continues.
Pure DOM + CSS transform/opacity. No video, no WebGL.

**B. Instrument panel — motion as telemetry behind auth.** Numbers count on
arrival, load bars grow from zero, scrape runs as five visible stages, rows
resolve in, route changes animate a short rise, empty state offers a sample run.

**C. Editorial scroll story — art-directed marketing site, separate from the
app.** Pinned sections, horizontal scroll through the three sources, generated
crawl line field. Most work, two systems to maintain, widest demo gap.

**D. Generative WebGL set piece in the hero.** Dropped. It is the literal
Awwwards route, it does not demo the product, it is the heaviest option, and
generative blobs are now the most recognisable AI tell of all.

**Chosen: A + B.** A is the conversion engine and the one moment people
remember. B is what makes it feel expensive once they are inside. C splits the
codebase and widens the gap between the marketing page and the product, which
quietly increases refunds — parked for SupportGeniusAI.

---

## 5. The design

### 5.1 Identity resolution

Keep the dark instrument identity. It is already distinctive; it is the
*enforcement* that is broken, not the intent. Hard corners stay, but they stop
being a `*` selector with `!important` and become a token.

- Delete `* { border-radius: 0 !important }`.
- Delete the global `h1..h6 { text-transform: uppercase }`.
- Set the radius scale so every step resolves to `0`, and let Clerk's embedded
  components receive `borderRadius: 0` through its `appearance.variables` API
  instead of being overridden from outside.
- **Uppercase is demoted to chrome.** Nav labels, table headers, badges and
  eyebrows may be uppercase. Page headings, hero headings, buttons and body are
  sentence case (Part B, B8).

### 5.2 Values (Part B, no invented numbers)

| Token | Old | New | Why |
|---|---|---|---|
| `--color-background` | `#09090b` | `#000000` | Part B dark base |
| `--color-surface` | `#000000` | `#181818` | panels must read as elevated, not recessed |
| `--color-surface-hover` | `#18181b` | `#1F1F1F` | next allowed step |
| `--color-border` | `#272727` | `#272727` | already allowed |
| accent | `#06b6d4` | `#18A9C2` | keeps hue 189, drops saturation 94% → 78% (Part B: under 80%) |
| accent-quiet | — | `rgba(24,169,194,0.12)` | tint only, never a glow |
| motion curve | none | `cubic-bezier(0.22,1,0.36,1)` | Part B B7 |
| motion durations | `transition-all` | 500ms transform, 300ms colour/opacity, never <200ms | B7 |

The accent change is one number and is trivially revertible. It exists because
a 94%-saturation cyan is the "AI neon" tell, and because a colour that loud
competes with the data it is meant to frame.

**Glow:** `--shadow-glow` is deleted. Exactly one place keeps a luminous
treatment — the scanning indicator during an active scrape. Everywhere else,
elevation is a border and a background step.

**Signal semantics (one accent, not three hues).** The existing
`--color-success-*` scale is amber and is used for a neutral state ("Extracted"),
which is why amber reads as a warning. It is renamed, not repainted: the same
`#f59e0b` becomes `--color-attention` and means only "needs work" — a mobile
load over 3000 ms, a failed field. Everything else is carried by weight and copy:

| Signal | Encoding |
|---|---|
| slow mobile load | `--color-attention` value + label, no fill |
| fast mobile load | foreground at full weight, `tabular-nums` |
| chatbot present | outline chip, `--color-border` |
| chatbot absent | accent chip — the actionable state, and the only accent in the row |

No new hex is introduced. `#f59e0b` already ships in `globals.css`.

**Gradients:** backgrounds stay flat (Part B B4). One gradient is permitted:
the hero heading text, `#FFFFFF → #9B9B9B`, defined in `globals.css` so the
token file exemption applies.

**Icons:** `lucide-react` retained at 1.5px stroke, 20px, per the recorded
exception in `AGENTS.md`. The **logo is not an icon** and stops being a lucide
`Database` glyph.

**Texture:** a generated dot grid at 4–6% opacity, defined as an inline SVG or
repeating-radial-gradient mask in `globals.css`. No stock photography, no
`picsum.photos`, no ambient gradient.

### 5.3 The signature moment — `<ExtractionDemo />`

The centrepiece, used on `/` and reusable behind auth as the sample-run empty
state. Pure DOM. No canvas, no video, no WebGL.

Sequence, on first intersection with the viewport:

1. Query types into the input, 40ms per character: `medspas in Austin, TX`.
2. Region chip `US` and source chip `Google Maps` take accent in turn.
3. Status strip advances: `Queued` → `Fetching 1/3` → `Fetching 3/3` →
   `Parsing` → `Enriching` → `Done`. 450ms per step.
4. Five result rows enter, 120ms apart, `opacity 0→1` and `translateY(8px)→0`.
5. Each row's mobile-load bar grows `scaleX(0)→value` over 500ms; the chatbot
   chip flips to its resolved state.
6. Pitch badges appear last, 60ms apart, at `scale(0.98)→1`.
7. The lead counter ticks `0 → 25` over 600ms, `tabular-nums`.

Total run ≈ 4.5s, then holds. Replays at most twice, then idles at the final
state. A visible `Replay` control (text button, not an icon) re-runs it on
demand.

**Reduced motion:** jump directly to the final state. No typing, no stagger, no
counting.

**Scroll continuation:** the demo panel is `position: sticky` for roughly one
and a half viewport heights while the surrounding copy advances; then it
releases. Implemented with sticky positioning plus `IntersectionObserver`. No
`window.addEventListener('scroll')`.

**Realism:** the rows must be actual scraped output or a clearly labelled
sample. Business names, phone numbers, load times and pitch hooks must be
plausible and non-round. No `Acme`, no `Example Co`, no `123 Main St`.

### 5.4 Landing page (`/`)

Structure per Part A2. Layout type **A, classic hero plus sections** — the
product is understandable from one screenshot of results, which is exactly what
the demo is.

1. **Hero** — heading, subheading (both max 680px), one primary CTA, one proof
   signal, `<ExtractionDemo />` as the hero visual.
2. **Tagline reveal** (mandatory, Part B B11) — two lines, large type, words
   activating one at a time in reading order from ~30% opacity on scroll.
3. **How it works** — three steps, the three real sources.
4. **Benefits** — three to five, outcome driven. Layout is a two-column zig zag,
   **not** three equal cards.
5. **Signals** — the pitch-hook logic explained, using the real thresholds that
   exist in `dashboard/page.tsx` (load > 3000ms → speed overhaul; no chatbot →
   RAG bot). This is the product's actual differentiator and it should be on the
   marketing page.
6. **FAQ** — six questions, plain question and answer for AEO.
7. **Final CTA** — identical to the hero.
8. **Footer** — wordmark, `/pricing`, `Sign in`, copyright. Part B B10 expects
   privacy and terms links; those routes do not exist. This is a logged
   follow-up, not two invented legal pages.

**Public `/pricing`.** New route, rendered from the real tiers already in
`dashboard/billing` — `$49` Pro and `Custom` enterprise. It uses this section's
layout and copy rules, not the authed billing chrome, and its CTA goes to
`/sign-up`. `dashboard/billing` remains the only place a subscription is
actually started.

**Copy direction.** Drop the theatre. The hero formula is outcome + audience:

- Heading: `Every lead on the page, with the pitch already written.`
- Subheading: `Pull local businesses from Google Maps, DuckDuckGo and Yellow
  Pages across six markets. We check their mobile speed and chatbot, then tell
  you which service to sell them.`
- Primary CTA: `Run a sample extraction` → `/sign-up`.
- Secondary: `See pricing` → `/pricing`, a text link, not a second button.
- Risk reversal: `Free to sign up. Cancel anytime.` — true of the current flow.

**The 25-free-leads claim is removed.** Nothing grants it: `/api/scrape`
returns `402` unless the Stripe subscription is `active` or `trialing`
(`services/api/src/main.py:78`). A visitor who signed up on that line would hit
a paywall immediately. Do not reinstate an offer unless the API enforces it.

**Facts rule.** There are no real testimonials or customer logos in this
product. Use `{{testimonial}}` and `{{customer_logo}}` placeholders and build the
layout to accommodate them. Do not invent proof. Prices ($49/month) come from
the existing billing page and may be used.

### 5.5 Dashboard (`/dashboard`)

The sidebar stays. Five destinations and a 484-line primary workflow is a
legitimate sidebar case; the Part B "dashboard always has a sidebar" flag is
noted and overridden deliberately.

- **KPI strip** above the table: leads found, mean mobile load, share without a
  chatbot, markets covered. Count up over 400ms on data arrival. Definitions are
  fixed: all four describe **the leads currently loaded** — `/api/leads` caps at
  200 rows and there is no count endpoint — and are labelled "across the leads
  shown". Mean mobile load averages measured leads only and ignores the `0`
  sentinel. No backend work.
- **Staged scrape — three honest stages, not five.** `/api/scrape` is a single
  blocking POST with no progress channel, so the client cannot know which source
  the server is on. In-product the strip reads `Queued` → `Extracting` with a
  live elapsed clock → `Done`, plus `Cancel` (an `AbortController` on the
  fetch). Past 20s it becomes an indeterminate activity line so a four-minute
  run does not read as stalled. The five-stage script stays on the landing demo
  (§5.3), where it is explicitly a demo of the pipeline.
- **Empty is not an error.** The API returns `200` with `leads: []` and a
  message when a scrape finds nothing (`main.py:88`). That renders as a distinct
  "nothing found — try a broader term" state, never as the failure banner.
- **Rows resolve in** on arrival: 40ms stagger, capped at 12 rows, then instant.
- **Route transitions:** a `template.tsx` per route, entering with `opacity 0→1`
  and `translateY(8px)→0` over 300ms. Verify the Next 16 primitive against
  `node_modules/next/dist/docs/` before implementing.
- **Active nav:** a 2px accent bar flush to the sidebar edge plus a background
  step. No glow.
- **Errors inline.** `alert()` is removed. Scrape failure renders a banner in
  the action bar naming what failed and offering `Try again`. Initial fetch
  failure gets a real error state with retry, not `console.warn`.
- **Dead surfaces stop pretending.** `settings` has a Save button with no
  handler; `history` is static. Both get an explicit "not available in this
  build" panel instead of controls that do nothing. No new behaviour is invented
  for them.

### 5.6 The shell, and the table at 390px

`dashboard/layout.tsx` is `h-screen` with a permanently fixed 256px sidebar. At
a 768px viewport that leaves roughly 448px for `<main>`, which no seven-column
table survives. Two changes, both switching at `lg` (1024px):

- Below `lg` the sidebar becomes a top bar with a menu button and a slide-over
  drawer. Nav items, the active bar, focus order and the skip link are unchanged
  inside it.
- Below `lg`, each lead becomes a card: business name plus region badge, then a
  two-column signal grid (mobile load, chatbot), then the pitch badge, then the
  website link. At `lg` and above, the real `<table>` is unchanged in structure.

Table semantics are preserved: a real `<table>` at `lg` and above. The mobile
card list is a `<ul>` with each field labelled, not a mutated table. No
horizontal scroll at any width.

### 5.7 Billing, pricing, settings — collision repair

These three keep their function and lose the indigo. They are rebuilt against
the same tokens as everything else: flat surfaces, one accent, hard corners,
sentence case, no `bg-gradient-to-*`, no `rounded-*` outside the zero scale.
The billing pricing cards keep their layout but drop the indigo/violet
gradient, the `scale-105`, and the gradient "Most Popular" pill (becomes a
square badge).

`PricingCard.tsx` is **not** dead code — it is imported only by
`/dashboard/pricing`, which passes `priceId="price_basic_123"` and
`"price_pro_456"` (`dashboard/pricing/page.tsx:22,35`). Those are placeholder
Stripe IDs, so that checkout errors on submit today.

Settled: `/dashboard/pricing` becomes a redirect to `/dashboard/billing` — the
live `$49` Pro / `Custom` flow — and `PricingCard.tsx` is deleted. The public
`/pricing` route described in §5.4 renders the same real tiers, with a
`/sign-up` CTA and no checkout call.

### 5.8 Logo and rename

**Mark: extraction bracket.** A bracket pair with a square pulled out of the
gap.

- `viewBox="0 0 24 24"`, `stroke-width="1.5"`, `stroke-linecap="square"`,
  `fill="none"`.
- Left bracket: `M9 4 H5 V20 H9`. Right bracket: `M15 4 H19 V20 H15`.
- Extracted square: 4×4 at `x=10, y=2.5`, filled with the accent, sitting above
  the bracket gap so it reads as lifted out.
- Mono variant: all foreground, no accent.
- Reads at 16px as two brackets and a dot. Nothing else is added.

Deliverables: `public/mark.svg` (24px, accent), `public/mark-mono.svg`,
`public/wordmark.svg`, `src/app/icon.svg` (favicon), and a `<Logo />` component
so the mark is never redrawn by hand in two places.

**Wordmark lockup:** `INSIGHT` in Geist semibold, `SCRAPER` in JetBrains Mono
medium, baseline aligned, 1px gap. Human word, machine word — it reinforces the
type system rather than adding a third face.

**Motion:** on an active scrape the square translates up 2px and fades, once per
stage change. Static otherwise. Reduced motion disables it.

**Rename: display strings only.**

| File | Change |
|---|---|
| `src/app/page.tsx:17` | wordmark → `<Logo />` |
| `src/app/page.tsx:42` | body copy |
| `src/app/dashboard/layout.tsx:29` | wordmark → `<Logo />` |
| `services/api/src/main.py:15` | FastAPI title |
| `README.md`, `CONTRIBUTING.md` | prose and title |

**Do not change these identifiers.** They are not the display name and changing
them breaks running systems:

- `docker-compose.yml` → `POSTGRES_DB: foundry` — renaming against the existing
  volume yields an empty database while the data sits in an orphaned volume.
- `render.yaml` → `databaseName: foundry`, `user: foundry_user` — Render
  blueprints do not rename a provisioned database; the service would point at
  one that does not exist.
- `services/api/src/db.py:7` — default DSN, local convenience only.

### 5.9 Remove the 3D layer

Delete `components/HeroScene.tsx`, the `<HeroScene />` import, and the
dependencies `three`, `@react-three/fiber`, `@react-three/drei`,
`@types/three`. Replace the hero visual with `<ExtractionDemo />` over the
generated dot grid.

Rationale: invisible at `#09090b` on `#09090b`, ~600 KB of JS for a wireframe,
and a runtime CDN fetch for an HDR map. The demo does the visual work better and
costs nothing at first paint. `next build` output before and after is the
evidence this worked.

If this is vetoed, the fallback is to keep the scene but make it visible
(`#181818` body, accent edges) and drop `<Environment>` for local lights. It
must not ship in its current state either way.

### 5.10 Clerk surfaces

`sign-in` and `sign-up` sit directly between the redesigned landing page and the
dashboard. They use `shadow-glow` (which §5.2 deletes), `bg-primary-600`,
uppercase Clerk headings, and the same theatre copy (`SECURE_LOGIN_TERMINAL //`).
Deleting the glow token forces them to be touched, so the scope is the minimum
for a continuous funnel:

- `appearance.variables`: `colorPrimary`, `colorBackground`, `colorText`,
  `borderRadius: 0`, and the Geist / JetBrains stacks.
- `appearance.elements`: flat card, one border, no shadow, square buttons.
- Theatre copy replaced with plain labels.
- No restructuring of Clerk's own component tree, no custom form.

---

## 6. Constraints

- Stack is fixed: Next.js 16.2.6, React 19.2.4, Tailwind v4 (`@theme` in
  `globals.css`), TypeScript. No new UI dependency. No Framer Motion.
- `apps/dashboard/AGENTS.md` requires reading `node_modules/next/dist/docs/`
  before using a Next API. Read it for `template.tsx`, `icon.svg`, and
  `opengraph-image` before implementing those.
- Clerk and Stripe integrations keep working. `getToken()`, `orgId`,
  `DEV_BYPASS_AUTH` and the dev-bypass header stay byte-compatible.
- Animate only `transform` and `opacity`.
- `prefers-reduced-motion` is honoured on every animation, without exception.
- Every radius, spacing, type size and colour resolves to §5.2 or Part B, **on
  the surfaces this spec rewrites**. Untouched utilities elsewhere are not
  mechanically converted; `design-lint` is the gate, not a repo-wide sweep.
- `--font-mono` stays JetBrains Mono. Part B names Geist Mono; this is a
  recorded exception added to `AGENTS.md` next to `lucide-react`, because a
  global swap reflows every table, badge and input and puts the `lg` table
  width at risk. The wordmark uses live type, not outlined paths.
- Tests: none exist for this app. Do not add a framework. Any new logic
  (pitch-hook thresholds, KPI aggregation, CSV shaping) moves into
  `src/lib/` as a pure function with `node:test` coverage, following the
  ClearGig precedent.

---

## 7. Acceptance gates

Run from the repo root unless stated.

1. `node scripts/design-lint.mjs apps/dashboard` → **0 errors, 0 warnings**.
2. `cd apps/dashboard && npx tsc --noEmit` → clean.
3. `cd apps/dashboard && npm run build` → passes; report the bundle delta versus
   the remove-3D step.
4. `1920`, `1440`, `1024`, `768`, `390` — screenshot each. No horizontal
   overflow at any width, no element clipped. `1024` and `768` are the ones that
   catch the sidebar/table collision.
5. Keyboard only: tab through `/`, the sidebar, the action bar, the table, and
   billing. Focus is visible on every stop. Skip link works.
6. `prefers-reduced-motion: reduce` — the demo is silent, the tagline reveal is
   fully lit, no element moves.
7. One scrape with the backend down → inline banner, not `alert()`, not a
   spinner. One scrape with the backend up → `Queued` / `Extracting` with a
   running clock / `Done`, then rows resolve. Cancel stops the request. A
   zero-result scrape shows the "nothing found" state, not the error banner.
8. Console clean on every route: no errors, no 404s, no CDN fetches.
9. `/` at 390px: primary CTA visible in the first screen without scrolling.
10. `/pricing` is public, reachable from `/` and the footer, and shows the real
    `$49` / `Custom` tiers.
11. `/dashboard/pricing` redirects to `/dashboard/billing`; `grep -r
    "price_basic_123\|price_pro_456" apps/dashboard/src` returns nothing.

---

## 8. Left to the builder

- Exact FAQ copy, subject to the six-question limit and the no-hyphen rule.
- The precise sample dataset used by `<ExtractionDemo />`, subject to §5.3
  realism.
- Component file layout under `src/components/`, keeping today's flat structure.
- The `opengraph-image` implementation, after consulting the Next 16 docs.
- Ordering within each fix area, following the Part B fix priority: typography,
  colour, states, layout, motion, components, states, copy, type polish.

---

## 9. Builder review — resolved

Ten questions came back from an independent read of this spec. Seven were
decisions this document should have made; they are now §5.2 (signal semantics),
§5.5 (KPI definitions, three-stage scrape, dead surfaces), §5.6 (shell at `lg`),
§5.10 (Clerk), §6 (mono exception, token-pass scope). Three needed the product
owner:

| Question | Resolution |
|---|---|
| "First 25 leads free" is not enforced by the API | Claim removed; replaced with a true risk reversal (§5.4) |
| No public pricing route, "See pricing" had no destination | Public `/pricing` added from the real tiers; CTA → `/sign-up` (§5.4) |
| `/dashboard/pricing` posts placeholder Stripe IDs | Redirect to `/dashboard/billing`, `PricingCard` deleted (§5.7) |

Deliberately not done, and logged as follow-up rather than silently skipped:
privacy and terms pages (Part B B10), and a backend progress channel for scrape
stages.
