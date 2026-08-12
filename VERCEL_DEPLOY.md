# Admin deployment on Vercel — step by step

Deploy the BandForge **admin UI** to Vercel. The admin **API** stays on Railway (FastAPI in `backend/`, code under `admin/api`).

| Layer | Host | Source |
|-------|------|--------|
| Admin UI + BFF | **Vercel** | [`matalabsio/admin`](https://github.com/matalabsio/admin) → folder `web/` |
| Admin + student API | **Railway** | [`matalabsio/backend`](https://github.com/matalabsio/backend) |
| Data / media | Supabase, R2, Redis | via Railway only |

Student app (separate): [`matalabsio/frontend`](https://github.com/matalabsio/frontend) → currently `https://frontend-chi-ebon-lxy95up4j4.vercel.app`

---

## Architecture (what talks to what)

```text
Browser  →  https://<admin>.vercel.app
         →  /api/auth/*   (Next BFF)  →  Railway /auth/*
         →  /api/admin/*  (Next BFF)  →  Railway /admin/*
```

- Browser only talks to **Vercel**.
- Cookies (`bf_access`, `bf_refresh`) are set on the **admin Vercel host**.
- Admin login is **email/password** at `/admin/login` (not Google).

---

## Prerequisites

- [ ] Railway backend is live
- [ ] You can open GitHub repo `matalabsio/admin`
- [ ] You know the allowlisted admin email (default: `product@matalabs.io`)

Verify API:

```bash
curl -fsS https://backend-production-a813.up.railway.app/health
```

---

## Step 1 — Prepare Railway (backend)

Railway → your API service → **Variables**.

### 1a. Required admin allowlist

```env
ADMIN_ALLOWED_EMAIL=product@matalabs.io
```

Must be identical on Vercel later.

### 1b. After you have the admin Vercel URL

Keep student app as `FRONTEND_URL`. Add the **admin** origin to `CORS_ORIGINS`:

```env
FRONTEND_URL=https://frontend-chi-ebon-lxy95up4j4.vercel.app
CORS_ORIGINS=https://<your-admin-project>.vercel.app
```

If you need both student + admin origins in CORS (comma-separated):

```env
CORS_ORIGINS=https://frontend-chi-ebon-lxy95up4j4.vercel.app,https://<your-admin-project>.vercel.app
```

Redeploy Railway if env does not hot-reload.

You can finish Step 1b after Step 4 once Vercel gives you the admin URL.

---

## Step 2 — Create the Vercel project

1. Open [Vercel](https://vercel.com) → **Add New…** → **Project**.
2. Import **`matalabsio/admin`** (not the monorepo, not `frontend`).
3. Configure:

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | `web` |
   | Framework | Next.js (auto) |
   | Install Command | `npm install` |
   | Build Command | `npm run build` |

4. **Do not** set Root Directory to repo root (`admin/`). The Next app lives in `web/`.
5. Pause before first deploy — add env vars in Step 3 first (or deploy, then set env and redeploy).

---

## Step 3 — Vercel environment variables

Vercel → project → **Settings** → **Environment Variables**.

Apply to **Production** and **Preview**:

| Variable | Value | Required |
|----------|--------|----------|
| `API_URL` | `https://backend-production-a813.up.railway.app` | Yes (runtime; preferred) |
| `NEXT_PUBLIC_API_URL` | same Railway URL | Yes (build-time fallback) |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` | Yes |
| `ADMIN_ALLOWED_EMAIL` | `product@matalabs.io` | Yes — must match Railway |

### Copy-paste block

```env
API_URL=https://backend-production-a813.up.railway.app
NEXT_PUBLIC_API_URL=https://backend-production-a813.up.railway.app
NEXT_PUBLIC_AUTH_ENABLED=true
ADMIN_ALLOWED_EMAIL=product@matalabs.io
```

### Rules

- No trailing slash on API URLs.
- Never use `localhost` / `127.0.0.1` on Vercel.
- After changing any `NEXT_PUBLIC_*` value → **Redeploy**.
- Changing only `API_URL` often works without a full rebuild; redeploy if proxies still fail.
- Admin does **not** need `NEXT_PUBLIC_OAUTH_SITE_URL` (Google is for the student app).

---

## Step 4 — Deploy

1. Click **Deploy** (or push to `main` on `matalabsio/admin`).
2. Note the production URL, e.g. `https://admin-xxxx.vercel.app`.
3. Open: `https://<admin>.vercel.app/admin/login`
4. Go back to Railway and set `CORS_ORIGINS` to include that admin URL (Step 1b).

### Optional custom domain

1. Vercel → **Domains** → add e.g. `admin.matalabs.io`.
2. Update Railway:

   ```env
   CORS_ORIGINS=https://admin.matalabs.io
   ```

---

## Step 5 — Bootstrap / promote admin user

The UI only admits users who:

1. Exist via backend auth (Supabase),
2. Have role `admin` or `super_admin`,
3. Match `ADMIN_ALLOWED_EMAIL` on **both** Railway and Vercel.

From a machine with backend credentials:

```bash
cd backend
source .venv/bin/activate
python scripts/bootstrap_admin_user.py
# or promote an existing user:
python scripts/promote_admin.py
```

Use the same email as `ADMIN_ALLOWED_EMAIL`. Sign in at `/admin/login` with email + password.

---

## Step 6 — Smoke test

| # | Test | Pass when |
|---|------|-----------|
| 1 | `curl <RAILWAY>/health` | OK |
| 2 | Open `/admin/login` | Form loads |
| 3 | Non-allowlisted login | Denied |
| 4 | Allowlisted admin login | Lands on `/admin`; KPIs load |
| 5 | Cookies on admin host | `bf_access` / `bf_refresh` present, `Secure` |
| 6 | `/admin/users`, `/admin/mocks`, `/admin/question-bank` | Load (or empty, not 503) |
| 7 | Logout | Session cleared; `/admin` → login |

---

## Local vs production

| | Local | Production |
|--|--------|------------|
| UI | `admin/web` → `http://127.0.0.1:3001` | Vercel HTTPS |
| API | `uvicorn` `:8000` | Railway |
| Env | `web/.env.local` from `web/.env.example` | Vercel project env |

Local setup: [LOCAL_SETUP.md](./LOCAL_SETUP.md)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails / wrong app | Root Directory must be `web` |
| `ENOENT` `routes-manifest-deterministic.json` after `next build` | Leave Output Directory empty; Root Directory = `web`; do not set `outputFileTracingRoot` on Vercel |
| `503` / cannot reach API | Set `API_URL` + `NEXT_PUBLIC_API_URL` to Railway URL; redeploy |
| Login loop | `NEXT_PUBLIC_AUTH_ENABLED=true` + redeploy; check `/api/auth/login` |
| `403` after login | Sync `ADMIN_ALLOWED_EMAIL`; run `promote_admin.py` |
| CORS in browser | Add admin origin to Railway `CORS_ORIGINS`; prefer `/api/*` on Vercel |
| Large upload fails | Next allows ~50MB; Vercel plan limits may still apply |

---

## Quick checklist

```text
Railway:
  [ ] curl /health OK
  [ ] ADMIN_ALLOWED_EMAIL=product@matalabs.io
  [ ] FRONTEND_URL= student Vercel URL
  [ ] CORS_ORIGINS includes admin Vercel URL

Vercel (import matalabsio/admin, Root Directory = web):
  [ ] API_URL=https://backend-production-a813.up.railway.app
  [ ] NEXT_PUBLIC_API_URL= same
  [ ] NEXT_PUBLIC_AUTH_ENABLED=true
  [ ] ADMIN_ALLOWED_EMAIL=product@matalabs.io
  [ ] Env on Production + Preview
  [ ] Deploy → /admin/login loads

Admin user:
  [ ] bootstrap_admin_user.py or promote_admin.py
  [ ] role admin/super_admin + allowlisted email

Smoke:
  [ ] Allowlisted login → dashboard
  [ ] Users / mocks / question-bank load
  [ ] Logout clears session
```
