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
  drawer, lead table, KPI strip and CSV export.
- **FastAPI service:** validated scrape requests, explicit error codes, health and
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
│           └── middleware.ts     # Clerk route protection
├── services/
│   └── api/                      # FastAPI Backend
│       ├── Dockerfile            # Container for FastAPI & Playwright
│       └── src/
│           ├── main.py           # FastAPI entrypoint & endpoints
│           ├── auth.py           # Clerk JWT verification middleware
│           ├── db.py             # PostgreSQL & RLS context managers
│           ├── models.py         # SQLAlchemy schemas
│           ├── init_db.py        # Database init script
│           ├── stripe_service.py # Stripe webhook handling
│           └── scraper_worker.py # Isolated Playwright extraction logic
├── docker-compose.yml            # Local orchestration stack
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started

The easiest way to run Insight Scraper locally is by using Docker Compose.

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- Node.js 20+ for the dashboard
- Optional: a [Clerk](https://clerk.com/) application for hosted auth
- Optional: a [Stripe](https://stripe.com/) account for billing

The API can run without Clerk or Stripe by enabling the auth bypass described below.
The dashboard still needs Clerk publishable keys in this build; a dashboard mode that
runs without Clerk is not implemented yet. The bypass flag is development-only and the
API refuses to start with it in production.

### 1. Environment Setup

You must configure your environment variables before spinning up the containers.

**Frontend Environment (`apps/dashboard/.env.local`)**
Create this file and add your keys:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
```

**Backend Environment (`services/api/.env.example`)**
The API reads its configuration from the process environment. Every supported variable
is documented in [`services/api/.env.example`](services/api/.env.example). The values
that matter locally are:

```env
ENVIRONMENT=development
DATABASE_URL=postgresql://user:password@localhost:5432/foundry
ALLOWED_ORIGINS=http://localhost:3000
DEV_BYPASS_AUTH=true          # local only
DEV_TENANT_ID=local_operator
```

With `DEV_BYPASS_AUTH=true`, requests run as `DEV_TENANT_ID` and no Clerk token is
required. Leave it unset for any deployment you intend to expose.

### Local API development without Clerk or Stripe

The backend can run without either service:

1. Start PostgreSQL and the API with `docker compose up --build`.
2. Set `DEV_BYPASS_AUTH=true` in the API environment.
3. Send requests with any `Authorization: Bearer` value; the API runs them as
   `DEV_TENANT_ID`.

The dashboard still requires Clerk publishable keys because its middleware protects
`/dashboard`. Running the whole product without Clerk is not implemented yet.

Hosted mode requires `CLERK_FRONTEND_API`, a Clerk organization on the user, and
`STRIPE_SECRET_KEY` plus `STRIPE_WEBHOOK_SECRET` before scraping is allowed.

### 2. Start the Scraper Backend Locally

Run the following command from the root directory to build and start the PostgreSQL database and FastAPI scraper backend (Playwright headless Chromium):
```bash
docker compose up --build
```

- **FastAPI Docs & Health:** Available at `http://localhost:8000/docs` and `http://localhost:8000/health`
- **PostgreSQL Database:** Running on port `5432` (database schema and RLS policies are initialized automatically on startup)

To run the Next.js dashboard locally alongside the backend:
```bash
cd apps/dashboard
npm install
npm run dev
```
Dashboard will be available at `http://localhost:3000` and automatically connects to your local FastAPI backend at `http://localhost:8000`.

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
