# Insight Scraper

[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF.svg)](https://clerk.com/)
[![Stripe](https://img.shields.io/badge/Billing-Stripe-635BFF.svg)](https://stripe.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docker.com/)

Insight Scraper extracts business leads from online directories, measures a small set of
website signals, and writes a pitch hook for each result. It ships as a Next.js dashboard,
a FastAPI service, and a Playwright scraper worker. A single-tenant local mode and a
Clerk/Stripe-backed hosted mode share the same code.

The marketing site describes what is implemented today. Features that are not yet built
are not advertised.

---

## 🌟 Key Features

- **Organization-scoped data:** Clerk organizations map to tenant ids, and database
  queries run inside a tenant session with PostgreSQL Row-Level Security policies.
- **Working dashboard:** responsive Next.js App Router UI with an accessible mobile
  drawer, lead table, KPI strip, CSV/JSON export, run history with rerun and delete,
  and persisted workspace defaults.
- **Async scrape jobs:** requests return `202` immediately, a cancellable Playwright
  subprocess does the work, and the dashboard polls job status until leads land.
- **FastAPI service:** validated scrape requests, explicit error codes, and health plus
  readiness probes.
- **Playwright extraction:** headless Chromium collects business details, mobile load
  time and chatbot-widget presence, then derives a pitch hook.
- **Stripe scaffolding:** webhook handling for subscription status. Checkout and a
  customer portal are not finished yet.

---

## 🏗️ Architecture

Insight Scraper utilizes a monorepo structure separating the presentation layer from the core business and scraping logic. The entire stack is orchestrated via Docker Compose for complete local parity with production.

### Technology Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons
- **Backend:** FastAPI, Uvicorn, Python 3.11+
- **Database:** PostgreSQL 15 (with SQLAlchemy)
- **Authentication:** Clerk
- **Billing:** Stripe
- **Orchestration:** Docker, Docker Compose

---

## 📂 Project Structure

```text
insight-scraper/
├── apps/
│   └── dashboard/                # Next.js App Router (Frontend)
│       ├── package.json
│       ├── Dockerfile            # Container for Next.js frontend
│       └── src/
│           ├── app/              # Routes (Dashboard, Billing, Sign-In, etc.)
│           ├── components/       # Shared UI
│           ├── lib/              # API client, auth mode, CSV/JSON export
│           └── proxy.ts          # Clerk route protection (Next.js 16 proxy)
├── services/
│   └── api/                      # FastAPI Backend
│       ├── Dockerfile            # Container for FastAPI & Playwright
│       └── src/
│           ├── main.py           # FastAPI entrypoint & endpoints
│           ├── auth.py           # Clerk JWT verification
│           ├── config.py         # Environment parsing and startup guard
│           ├── db.py             # PostgreSQL & RLS context managers
│           ├── models.py         # SQLAlchemy schemas
│           ├── jobs.py           # Scrape job lifecycle, dedupe, cancellation
│           ├── scraper_runner.py # Cancellable Playwright subprocess wrapper
│           ├── scraper_worker.py # Isolated Playwright extraction logic
│           ├── init_db.py        # Database init script
│           └── stripe_service.py # Stripe webhook handling
├── docker-compose.yml            # Local orchestration stack
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started

There are two supported ways to run the product:

- **Local operator mode** — no Clerk, no Stripe, no Docker. A single operator runs the
  API and dashboard on your machine. This is the fastest way to see the whole loop.
- **Hosted mode** — Clerk organizations and Stripe billing, deployed to Render and
  Vercel. Requires real credentials.

### Prerequisites

- Node.js 20+
- Python 3.11+
- Optional: [Docker & Docker Compose](https://www.docker.com/) for the PostgreSQL stack
- Optional: a [Clerk](https://clerk.com/) application for hosted auth
- Optional: a [Stripe](https://stripe.com/) account for billing

### Quick start: local operator mode

This path runs the API against SQLite and the dashboard without Clerk. It is
development-only: the API refuses to start with the auth bypass in production.

**1. Install backend dependencies**

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r services/api/requirements.txt
playwright install chromium
```

**2. Create the database and start the API**

```bash
cd services/api/src
export DATABASE_URL="sqlite:///./local.db"   # PowerShell: $env:DATABASE_URL="sqlite:///./local.db"
export DEV_BYPASS_AUTH=true
export DEV_TENANT_ID=local_operator
export ALLOWED_ORIGINS=http://localhost:3000
python -c "import init_db; init_db.init_db()"
python -m uvicorn main:app --port 8000
```

A repo-level `.env` is loaded automatically when present, so you can keep these values
in one file instead of exporting them per shell.

**3. Start the dashboard**

```bash
cd apps/dashboard
npm install
```

Create `apps/dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=local
```

Then run `npm run dev` and open `http://localhost:3000`. In local mode the dashboard
skips Clerk entirely, sends `Bearer dev_bypass_token`, and hides billing.

### Hosted mode

Hosted mode requires `CLERK_FRONTEND_API`, a Clerk organization on the user, and
`STRIPE_SECRET_KEY` plus `STRIPE_WEBHOOK_SECRET` before scraping is allowed. Set
`NEXT_PUBLIC_AUTH_MODE=clerk` (or leave it unset) in the dashboard.

**Frontend Environment (`apps/dashboard/.env.local`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
```

**Backend Environment**
Every supported variable is documented in
[`services/api/.env.example`](services/api/.env.example). The values that matter
locally are:

```env
ENVIRONMENT=development
DATABASE_URL=postgresql://user:password@localhost:5432/foundry
ALLOWED_ORIGINS=http://localhost:3000
DEV_BYPASS_AUTH=true          # local only
DEV_TENANT_ID=local_operator
```

With `DEV_BYPASS_AUTH=true`, requests run as `DEV_TENANT_ID` and no Clerk token is
required. Leave it unset for any deployment you intend to expose. Production refuses to
boot if the flag is present.

### Docker Compose (PostgreSQL stack)

```bash
docker compose up --build
```

- **FastAPI docs & health:** `http://localhost:8000/docs` and `http://localhost:8000/health`
- **PostgreSQL:** port `5432`; the schema and RLS policies are initialized on startup.

To run the dashboard alongside it, follow step 3 above.

---

## 🔌 API Reference

All `/api` routes require `Authorization: Bearer <token>`. In local operator mode the
token value is ignored and the request runs as `DEV_TENANT_ID`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/scrape?query=&region=&source=&limit=` | Queue a scrape job. Returns `202` with the job. |
| `GET` | `/api/jobs?limit=&offset=` | Run history, newest first. |
| `GET` | `/api/jobs/{id}` | Job status, stage and counters. |
| `GET` | `/api/jobs/{id}/leads` | Leads produced by one job. |
| `POST` | `/api/jobs/{id}/cancel` | Terminate a running worker. |
| `POST` | `/api/jobs/{id}/rerun` | Queue a new job from the same parameters. |
| `DELETE` | `/api/jobs/{id}` | Delete a job and its leads. |
| `GET` | `/api/settings` | Workspace defaults (`region`, `source`, `limit`). |
| `PUT` | `/api/settings` | Persist workspace defaults. |
| `GET` | `/api/leads` | Most recent 200 leads for the tenant. |
| `POST` | `/api/webhooks/stripe` | Stripe subscription events (`503` when unconfigured). |
| `GET` | `/health` | Liveness. |
| `GET` | `/health/ready` | Readiness; fails when the database is unreachable. |

Job status values are `queued`, `running`, `succeeded`, `failed`, `cancelled` and
`empty`. A successful scrape with zero results returns `empty` rather than an error.

---

## 🛡️ Security & Tenant Isolation

This application is designed around tenant isolation:
1. **Authentication:** The frontend retrieves a JWT from Clerk.
2. **Verification:** The FastAPI backend verifies the JWT against Clerk's JWKS and
   extracts the `org_id`. A token without an organization is rejected with `403`.
3. **Data Access:** The `tenant_session(tenant_id)` context manager sets
   `app.current_tenant` for the transaction.
4. **Policy Enforcement:** PostgreSQL RLS policies restrict reads and writes to the
   current tenant.

The policies exist in `init_db.py`, but cross-tenant isolation does not yet have an
automated test. Treat that as a Phase 2 requirement before inviting outside users.

---

## 🚢 Deployment

Insight Scraper is designed to be cloud-native and easily deployable using modern Platform as a Service (PaaS) providers.

### Frontend Deployment (Vercel)
The Next.js dashboard is optimized for seamless deployment on Vercel:
1. Connect your GitHub repository to Vercel.
2. Set the Framework Preset to Next.js and the Root Directory to `apps/dashboard`.
3. Configure the required environment variables (`NEXT_PUBLIC_API_URL`, Clerk, and Stripe keys).
4. Deploy to the Edge for global low-latency access.

### Backend & Database Deployment (Render Blueprint)
The FastAPI scraper backend and PostgreSQL database are ready for deployment via Render's free tier with zero cloud costs:
1. Connect your GitHub repository to [Render](https://render.com).
2. Use **New + -> Blueprint** and select your repository; Render will automatically detect `render.yaml`.
3. The blueprint provisions:
   - A free PostgreSQL database (`insight-scraper-db`).
   - A free Web Service running the FastAPI + Playwright container with memory safeguards enabled (`LOW_MEMORY_MODE=true`, JS heap capped at 256MB, and heavy media blocking to prevent OOM errors on Render's 512MB RAM free tier).
4. Point your Vercel frontend's `NEXT_PUBLIC_API_URL` to your Render service URL (e.g., `https://insight-scraper-api.onrender.com`).
5. Set `ENVIRONMENT=production` and `ALLOWED_ORIGINS` to the exact frontend origin.
   `render.yaml` already does this for `https://insight-scraper.vercel.app`; update it
   if your domain differs. Never set `DEV_BYPASS_AUTH` in production.
Alternatively, connect an external free PostgreSQL instance (such as Supabase or Neon) by updating `DATABASE_URL` in the Render service settings.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
