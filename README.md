# Foundry-SaaS (formerly Insight Scraper)

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF.svg)](https://clerk.com/)
[![Stripe](https://img.shields.io/badge/Billing-Stripe-635BFF.svg)](https://stripe.com/)
[![Playwright](https://img.shields.io/badge/Scraping-Playwright-2EAD33.svg)](https://playwright.dev/)

Foundry-SaaS is a professional, multi-tenant B2B platform designed to extract, manage, and monetize high-value business leads from online directories. Originally built as a standalone local tool (Insight Scraper), it has been completely re-architected into a highly scalable cloud application featuring strict data isolation, subscription-based billing, and an enterprise-grade API layer.

## 🌟 Key Features

- **Multi-Tenant Architecture:** Seamlessly supports multiple organizations using Clerk Identity, mapping users to specific tenant IDs.
- **Ironclad Data Security (RLS):** Employs PostgreSQL Row-Level Security (RLS) to guarantee complete data isolation between tenants at the database level.
- **Premium B2B Dashboard:** A fast, responsive frontend built with Next.js (App Router) and Tailwind CSS.
- **High-Performance API Engine:** A FastAPI backend orchestrates asynchronous data scraping tasks while respecting concurrency limits to prevent IP blocks.
- **Integrated Monetization:** Built-in Stripe webhook integration automatically tracks subscription statuses, securely gating access to core scraper functionality.
- **Robust Web Scraping:** Uses headless Chromium via Playwright and BeautifulSoup4 to reliably extract data from modern, JavaScript-heavy web applications.

## 🏗️ Architecture

Foundry-SaaS utilizes a monorepo structure separating the presentation layer from the core business and scraping logic.

- `apps/dashboard`: Next.js frontend application.
- `services/api`: FastAPI backend service, database logic, and Playwright worker processes.

### Technology Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** FastAPI, Uvicorn, Python 3.11+
- **Database:** PostgreSQL (with SQLAlchemy and `asyncpg`/`psycopg2`)
- **Authentication:** Clerk
- **Billing:** Stripe
- **Scraping Engine:** Playwright, BeautifulSoup4, Pandas

## 📂 Project Structure

```text
foundry-saas/
├── apps/
│   └── dashboard/                # Next.js App Router (Frontend)
│       ├── package.json
│       ├── src/
│       └── tailwind.config.ts
├── services/
│   └── api/                      # FastAPI Backend
│       ├── requirements.txt
│       ├── Dockerfile            # Container for the FastAPI backend
│       ├── Dockerfile.lambda     # AWS Lambda deployment configuration
│       └── src/
│           ├── main.py           # FastAPI entrypoint & concurrency controls
│           ├── auth.py           # Clerk JWT verification middleware
│           ├── db.py             # PostgreSQL connection & RLS context managers
│           ├── models.py         # SQLAlchemy schemas (leads, subscriptions)
│           ├── init_db.py        # Database initialization and RLS policy setup
│           ├── stripe_service.py # Stripe webhook handling
│           └── scraper_worker.py # Isolated Playwright extraction logic
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Active Clerk and Stripe developer accounts

### 1. Database Setup
Ensure PostgreSQL is running, create a database (e.g., `foundry`), and initialize the schema and RLS policies:
```bash
cd services/api/src
export DATABASE_URL="postgresql://user:password@localhost:5432/foundry"
python init_db.py
```

### 2. Backend Initialization (FastAPI)
Install the required dependencies and start the API server:
```bash
cd services/api/src
pip install -r requirements.txt
playwright install chromium

# Set required environment variables
export CLERK_FRONTEND_API="https://your-clerk-api.clerk.accounts.dev"
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."

uvicorn main:app --reload --port 8000
```

### 3. Frontend Initialization (Next.js)
Install node modules and start the development server:
```bash
cd apps/dashboard
npm install
npm run dev
```

The application dashboard will be accessible at `http://localhost:3000`, communicating with the backend API at `http://localhost:8000`.

## 🛡️ Security & Tenant Isolation

This application uses a strict security model:
1. **Authentication:** The frontend retrieves a JWT from Clerk.
2. **Verification:** The FastAPI backend verifies the JWT using the `verify_clerk_token` dependency and extracts the `org_id`.
3. **Data Access:** The `tenant_session(tenant_id)` context manager injects `SET LOCAL app.current_tenant = '<tenant_id>'` into the active database transaction.
4. **Policy Enforcement:** PostgreSQL RLS policies automatically restrict all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` queries to the authenticated tenant's data.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check [issues page](#) if you want to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential. All rights reserved.
