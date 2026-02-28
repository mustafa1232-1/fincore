# FinCore AI Smart ERP

Production-oriented multi-tenant accounting and mini-ERP platform:
- Backend: Node.js + TypeScript + PostgreSQL + REST + JWT (access/refresh)
- Frontend: Flutter (Web + Android + iOS)
- Storage: Supabase (file upload)
- Deployment: Docker + Railway

## Project Structure

- `backend/`: clean architecture backend
- `lib/`: Flutter app (enterprise shell + dashboard + modules pages)
- `docker-compose.yml`: local backend + PostgreSQL
- `railway.json`: Railway deployment config

## Backend Features Implemented

- Multi-tenant isolation (`tenant_id` enforced in repositories)
- Auth:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- Setup Wizard:
  - `POST /api/v1/setup/suggestions`
  - `POST /api/v1/setup/complete`
- Module Management + permissions (read/write/delete)
- Accounting:
  - chart of accounts tree
  - journal entries with debit=credit validation
  - trial balance generation
  - trial balance excel import + missing account auto-create
- Financial Statements:
  - income statement
  - balance sheet
  - cash flow (indirect simplified)
  - margin/cost/expense ratio metrics
- Budget engine (required sales + distribution)
- Forecast engine (trend + growth + seasonality)
- Inventory + stock moves
- POS/Invoice with automatic journal integration
- AI Assistant endpoint with real-data rule analysis (`/api/v1/ai/ask`)
- Dashboard KPIs + SSE stream endpoint
- Global search endpoint (`/api/v1/search`)
- File upload to Supabase (`/api/v1/files/upload`)

## Database

SQL migration file:
- `backend/src/database/migrations/001_init.sql`

Includes required tables:
- `tenants`, `users`, `roles`, `permissions`, `modules`, `tenant_modules`
- `accounts`, `journal_entries`, `journal_lines`, `trial_balances`
- `budgets`, `forecasts`
- `items`, `warehouses`, `stock_moves`
- `invoices`, `invoice_lines`
- `ai_logs`, `activity_logs`

And supporting table:
- `refresh_tokens`

## Environment Variables

Use `backend/.env.example` as base:

- `DATABASE_URL=`
- `JWT_SECRET=`
- `REFRESH_SECRET=`
- `SUPABASE_URL=`
- `SUPABASE_KEY=`
- `SUPABASE_BUCKET=`
- `PORT=`
- `CORS_ORIGIN=`

## Local Run (Backend)

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Health check:
- `GET http://localhost:8080/health`

## Local Run (Flutter)

```bash
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:8080/api/v1
```

## Docker Run

1. Create `backend/.env` from `.env.example`
2. Run:

```bash
docker compose up --build
```

Services:
- API: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

## Railway Deployment

- `railway.json` configured to build from `backend/Dockerfile`
- Set Railway environment variables from `backend/.env.example`
- Ensure PostgreSQL plugin is attached and `DATABASE_URL` points to it

## Flutter UI Implemented

- Responsive enterprise shell with sidebar navigation
- Dashboard with KPI cards + chart + AI chat card
- Command palette (`Ctrl + K`)
- Global search UX
- Smart data tables (filter + pagination)
- Auto-save draft + undo example in Settings
- Offline awareness indicator (connectivity status)

## Quality Checks

Executed:
- `cd backend && npm run build`
- `flutter analyze`
- `flutter test`

All pass.
