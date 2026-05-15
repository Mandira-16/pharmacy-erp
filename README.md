# SmartERP — AI-Integrated Pharmacy Management System

> An intelligent ERP platform for Sri Lankan SME retail pharmacies, combining real-time pharmacy operations with XGBoost demand forecasting, prescriptive decision support, and PDPA-compliant patient data management.

**Live Demo:** [pharmacy-erp-production-9ff9.up.railway.app](https://pharmacy-erp-production-9ff9.up.railway.app)  
**ML API:** [comfortable-encouragement-production-fd8b.up.railway.app](https://comfortable-encouragement-production-fd8b.up.railway.app/health)

---

## Overview

SmartERP addresses the critical gap in Sri Lankan SME pharmacy operations — where forecasting errors of 141–191% and annual medicine wastage of LKR 4.06 billion persist due to manual, fragmented workflows.

The system integrates:
- **9 operational modules** covering the full pharmacy workflow
- **XGBoost forecasting engine** achieving 21.31% MAPE — 5× better than the industry baseline
- **PDPA-compliant patient records** with OTP consent and email-based revocation
- **Prescriptive DSS** that converts AI forecasts into actionable business decisions
- **FEFO batch deduction** enforced at transaction level

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@pharmacy.com | Admin@1234 |
| Pharmacist | pharmacist@pharmacy.com | Pharma@1234 |
| Owner | owner@pharmacy.com | Owner@1234 |
| Assistant | assistant@pharmacy.com | Assistant@1234 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend / Backend | Next.js 16, TypeScript, React |
| Database | PostgreSQL via Supabase (Singapore) |
| ORM | Prisma v6 |
| Authentication | NextAuth v5, BCrypt |
| AI / ML | XGBoost, Python 3.10, Flask |
| UI Components | shadcn/ui, Lucide React |
| Deployment | Railway (2 services) |

---

## System Architecture

```
Browser
   ↓ HTTPS
Next.js 16 (Railway)
   ↓ Prisma ORM        ↓ HTTP REST
PostgreSQL           Flask API (Railway)
(Supabase)               ↓
                    XGBoost Model (.pkl)
```

---

## Modules

| Module | Description |
|---|---|
| **Dashboard** | Real-time KPIs, revenue vs AI forecast chart, smart alerts panel |
| **Point of Sale** | FEFO batch deduction, patient linking, prescription enforcement, Gmail receipt |
| **Inventory** | Batch-level tracking, expiry monitoring, CRUD with validation |
| **Patient Records** | PDPA OTP consent, 10-day access window, email revocation |
| **Suppliers** | Stock alerts, auto-drafted procurement emails |
| **Demand Forecast** | XGBoost 30/60/90-day predictions, feature importance |
| **Smart Alerts (DSS)** | Expiry liquidation, stockout prevention, revenue forecasting |
| **Reports** | 4 tabs, period selector, CSV export |

---

## AI Model Performance

| Metric | Optimised XGBoost | SARIMA Baseline | Industry Baseline |
|---|---|---|---|
| MAPE | **21.31%** | 29.19% | 141–191% |
| MAE | **62.00 units** | 100.97 units | — |
| RMSE | **93.02 units** | 188.08 units | — |

**Training data:** 7,485 Sri Lanka-filtered pharmaceutical sales records  
**Features:** 21 engineered features — lag, rolling averages, temporal, contextual, categorical  
**Holdout:** 90-day temporal split (no data leakage)

---

## Local Installation

### Prerequisites

- Node.js v20.9.0 or higher
- Python 3.10 or higher
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Mandira-16/pharmacy-erp.git
cd pharmacy-erp
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
GMAIL_USER="your-gmail@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
```

> Contact the developer for database credentials if evaluating independently.

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Seed the database

```bash
npx prisma db seed
```

This creates demo users, 10 medicines with batch data, 2 suppliers, and 7 patients.

### 6. Install Python dependencies

```bash
cd ml
pip install flask flask-cors numpy pandas xgboost scikit-learn gunicorn
cd ..
```

### 7. Run the application

Open two terminals:

**Terminal 1 — Next.js app:**
```bash
npm run dev
```
Access at: http://localhost:3000

**Terminal 2 — Flask ML service:**
```bash
cd ml
python app.py
```
ML API at: http://localhost:5000

> The Demand Forecast module requires Terminal 2. All other modules work without it.

---

## PDPA Compliance

SmartERP implements the Sri Lanka Personal Data Protection Act No. 9 of 2022 through:

- **OTP Consent** — 6-digit code sent to patient email, valid 15 minutes
- **Time-Limited Access** — consent expires automatically after 10 days
- **Email Revocation** — patients can revoke access instantly via a signed link
- **API Enforcement** — `consentFlag` checked at database level before any history is returned
- **Role Protection** — middleware blocks URL-based access bypass

---

## Role-Based Access Control

| Module | Admin | Pharmacist | Owner | Assistant |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Point of Sale | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD |
| Patient Records | ✅ | ✅ | ✅ | ✅ |
| Suppliers | ✅ + Email | ✅ + Email | ✅ View | ✅ View |
| Demand Forecast | ✅ | ✅ | ✅ | ❌ |
| Smart Alerts | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ |

---

## Project Structure

```
pharmacy-erp/
├── app/                    # Next.js pages and API routes
│   ├── api/                # Serverless API routes
│   │   ├── dashboard/
│   │   ├── medicines/
│   │   ├── patients/
│   │   ├── pos/
│   │   ├── suppliers/
│   │   ├── dss/
│   │   └── reports/
│   ├── dashboard/
│   ├── inventory/
│   ├── patients/
│   ├── pos/
│   ├── suppliers/
│   ├── forecasting/
│   ├── dss/
│   ├── reports/
│   └── consent/revoke/
├── components/             # Shared UI components
│   ├── Sidebar.tsx
│   ├── AppLayout.tsx
│   ├── Toast.tsx
│   └── InventoryModals.tsx
├── lib/                    # Shared utilities
│   ├── prisma.ts
│   ├── email.ts
│   └── validations.ts
├── ml/                     # Flask ML microservice
│   ├── app.py
│   ├── pharmacy_xgboost_model.pkl
│   └── requirements.txt
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── auth.ts                 # NextAuth configuration
├── proxy.ts                # Route protection middleware
└── railway.toml            # Railway deployment config
```

---

## Deployment

The system is deployed across two Railway services:

| Service | Platform | URL |
|---|---|---|
| Next.js App | Railway | pharmacy-erp-production-9ff9.up.railway.app |
| Flask ML API | Railway | comfortable-encouragement-production-fd8b.up.railway.app |
| Database | Supabase PostgreSQL | Singapore region |

### Deploy to Railway

1. Fork this repository
2. Create a new Railway project
3. Connect your GitHub repository
4. Add environment variables in Railway dashboard
5. Set build command: `npx prisma generate && npm run build`
6. For Flask service: set root directory to `/ml`

---

## Academic Context

**Project:** PUSL3190 Computing Project  
**Degree:** BSc (Hons) Software Engineering  
**University:** University of Plymouth / NSBM Green University  
**Student:** Ruwanpathiranage De Silva (10952854)  
**Supervisor:** Ms. Lakni Peiris  
**Year:** 2025–2026

---

## License

This project was developed as an academic prototype. All rights reserved.

---

*SmartERP — Intelligent Pharmacy Management for Sri Lankan SMEs*