# Insight Scraper Dashboard

Next.js 16 App Router frontend for Insight Scraper.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The dashboard talks to the API at
`NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.

Copy `.env.example` to `.env.local`.

### Local operator mode

No Clerk or Stripe account is needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=local
```

The dashboard skips Clerk, sends `Bearer dev_bypass_token`, hides billing, and shows a
"local operator" badge. The API must run with `DEV_BYPASS_AUTH=true`.

### Hosted mode

Leave `NEXT_PUBLIC_AUTH_MODE` unset (or set it to `clerk`) and fill in the Clerk values.
See the repository README for the full hosted setup.

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
- `src/lib/` — API URL resolution, job client, auth mode, lead shaping, CSV/JSON export.
- `src/proxy.ts` — Clerk route protection (Next.js 16 renamed `middleware.ts`).
