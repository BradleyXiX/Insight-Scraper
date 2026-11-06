# Insight Scraper Dashboard

Next.js 16 App Router frontend for Insight Scraper.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The dashboard talks to the API at
`NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.

Copy `.env.example` to `.env.local` and fill in the Clerk values for hosted mode. For
local-only work, the API can run with its development auth bypass instead; see the
repository README.

## Checks

```bash
npm run lint:design   # design tokens and banned patterns
npm test              # unit tests in src/lib
npx tsc --noEmit      # types
npm run build         # production build
```

## Layout

- `src/app/` — marketing pages, Clerk routes, dashboard routes and the Stripe checkout
  route handler.
- `src/components/` — dashboard shell, lead table, KPI strip, pricing tiers.
- `src/lib/` — API URL resolution, lead shaping and CSV export.
