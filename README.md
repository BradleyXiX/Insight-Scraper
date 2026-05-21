# Foundry-SaaS

[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF.svg)](https://clerk.com/)
[![Stripe](https://img.shields.io/badge/Billing-Stripe-635BFF.svg)](https://stripe.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docker.com/)

Foundry-SaaS is a professional, multi-tenant B2B platform designed to extract, manage, and monetize high-value business leads from online directories. Originally built as a standalone local tool (Insight Scraper), it has been completely re-architected into a highly scalable, containerized cloud application featuring strict data isolation, subscription-based billing, and an enterprise-grade API layer.

---

## 🌟 Key Features

- **Multi-Tenant Architecture:** Seamlessly supports multiple organizations using Clerk Identity, mapping users to specific tenant IDs.
- **Ironclad Data Security (RLS):** Employs PostgreSQL Row-Level Security (RLS) to guarantee complete data isolation between tenants at the database level.
- **Premium B2B Dashboard:** A fast, responsive frontend built with Next.js (App Router), Tailwind CSS, and a sleek dark-mode glassmorphic aesthetic.
- **High-Performance API Engine:** A FastAPI backend orchestrates asynchronous data scraping tasks while respecting concurrency limits to prevent IP blocks.
- **Integrated Monetization:** Built-in Stripe Checkout and webhook integration automatically tracks subscription statuses, securely gating access to core scraper functionality.
- **Robust Web Scraping:** Uses headless Chromium via Playwright to reliably extract data from modern, JavaScript-heavy web applications.

---

## 🏗️ Architecture

Foundry-SaaS utilizes a monorepo structure separating the presentation layer from the core business and scraping logic. The entire stack is orchestrated via Docker Compose for complete local parity with production.

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
foundry-saas/
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

The easiest way to run Foundry-SaaS locally is by using Docker Compose.

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- Active [Clerk](https://clerk.com/) developer account
- Active [Stripe](https://stripe.com/) developer account

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

**Backend Environment (via Docker Compose)**
The `docker-compose.yml` automatically passes keys from the host to the FastAPI container. Alternatively, you can create a `.env` file at the root:
```env
CLERK_FRONTEND_API=https://your-clerk-api.clerk.accounts.dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Start the Stack

Run the following command from the root directory to build and start the database, backend, and frontend containers:
```bash
docker-compose up --build
```

- **Next.js Dashboard:** Available at `http://localhost:3000`
- **FastAPI Docs:** Available at `http://localhost:8000/docs`
- **PostgreSQL:** Running on port `5432`

### 3. Database Initialization (First Time Only)

Once the containers are running, you need to initialize the PostgreSQL schema and Row-Level Security policies. Exec into the running API container:
```bash
docker exec -it <api_container_name> /bin/bash
cd src
python init_db.py
```

---

## 🛡️ Security & Tenant Isolation

This application uses a strict security model to ensure B2B data integrity:
1. **Authentication:** The frontend retrieves a JWT from Clerk.
2. **Verification:** The FastAPI backend verifies the JWT using the `verify_clerk_token` dependency and extracts the `org_id`.
3. **Data Access:** The `tenant_session(tenant_id)` context manager injects `SET LOCAL app.current_tenant = '<tenant_id>'` into the active database transaction.
4. **Policy Enforcement:** PostgreSQL RLS policies automatically restrict all queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to the authenticated tenant's data. A leaked query string can never expose cross-tenant data.

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
