# BandForge Admin

Admin UI + admin API live under this folder. The student app (`frontend/`) no longer serves `/admin`.

```text
admin/
  web/       # Next.js admin UI (port 3001)
  api/       # FastAPI admin package (mounted by backend)
  scripts/   # bootstrap / promote / sample ingest helpers
  seed/      # sample JSON for mock ingest
  tests/     # pytest suite (symlinked from backend/tests/admin)
```

## Architecture

- **One FastAPI process** (`backend/`) still serves `/admin/*`.
- Source of truth for admin Python code is [`admin/api`](api/).
- `backend/app/admin` is a **symlink** → `../../admin/api` so `from app.admin import …` keeps working.
- Admin UI is a **separate Next app** at [`admin/web`](web/) that proxies `/api/admin/*` and `/api/auth/*` to the same backend.

```text
Browser (admin/web :3001)
  → /api/admin/*  (Next BFF)
  → FastAPI /admin/*  (backend :8000, code in admin/api)
  → Supabase / R2 / Redis
```

## Production (Vercel)

Deploy the Next.js admin UI to Vercel against the existing Railway FastAPI backend. Full steps (env vars, CORS, bootstrap, smoke tests, troubleshooting):

→ **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)**

Root Directory on Vercel must be `admin/web`. Python admin API is **not** hosted on Vercel.

## Local development

### 1. Backend (unchanged)

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Admin UI

```bash
cd admin/web
cp .env.example .env.local   # if needed
npm install
npm run dev                  # http://127.0.0.1:3001
```

Open **http://127.0.0.1:3001/admin/login**.

### 3. Student app (optional, separate)

```bash
cd frontend
npm run dev                  # http://127.0.0.1:3000 — no /admin routes
```

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `ADMIN_ALLOWED_EMAIL` | backend + `admin/web` | Fail-closed allowlist for admin role access |
| `API_URL` / `NEXT_PUBLIC_API_URL` | `admin/web` | FastAPI base URL for BFF proxy |
| `NEXT_PUBLIC_AUTH_ENABLED` | `admin/web` | Must be `true` for session proxy gates |

Set the same admin email on the backend and admin web.

## Scripts

Run from `backend/` so `app.*` imports resolve (wrappers remain under `backend/scripts/`):

```bash
cd backend && source .venv/bin/activate
python scripts/bootstrap_admin_user.py
python scripts/promote_admin.py
# or directly:
python ../admin/scripts/promote_admin.py
```

Ingest samples: [`admin/seed/`](seed/).

## Tests

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/admin/ -q
# same files live in admin/tests/ (symlink)
```

## Key URLs (admin web)

| Path | Purpose |
|------|---------|
| `/admin/login` | Admin email/password sign-in |
| `/admin` | Dashboard KPIs |
| `/admin/users`, `/admin/mocks`, … | Catalog / ops |
| `/admin/speaking`, `/admin/writing`, `/admin/diagnostics` | Evaluator queues |
| `/admin/review-analytics`, `/admin/payments`, `/admin/ai` | Analytics / revenue / AI ops |
| `/admin/settings/audit` | Audit log |

API paths remain `GET/PATCH /admin/...` on the FastAPI server.
