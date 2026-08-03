# Production — Admin on Vercel + Railway API

Deploy the BandForge **admin UI** (`admin/web`) to Vercel. The admin **API** stays on the existing FastAPI backend on Railway (Python under `admin/api` is mounted by `backend/`, not a separate Vercel service).

| Layer | Host | Path |
|-------|------|------|
| Admin UI + BFF | **Vercel** | `admin/web` |
| Admin + student API | **Railway** | `backend/` (includes `admin/api` via symlink) |
| Data / media | Supabase, R2, Redis | via Railway only |

**Related:** [README.md](./README.md) · [LOCAL_SETUP.md](./LOCAL_SETUP.md) · student Vercel guide in `test/BandForge Brand/docs/vercel-production.md`

---

## How traffic flows

The browser only talks to **Vercel**. Next.js route handlers proxy to **Railway**. Session cookies are set on the **admin Vercel host** by the BFF — the browser does not need CORS to Railway for normal admin use.

```text
Browser  →  https://<admin>.vercel.app
         →  /api/auth/*   (Next BFF)  →  Railway /auth/*
         →  /api/admin/*  (Next BFF)  →  Railway /admin/*
         →  Supabase / R2 / Redis
```

Cookies (host-only on the admin origin):

- `bf_access` — httpOnly JWT (~15 min)
- `bf_refresh` — httpOnly refresh (~30 days)
- `bf_has_session` — non-httpOnly hint for client JS

In production, cookies use `Secure` + `SameSite=lax` (no shared `Domain` with the student app).

---

## Prerequisites

- [ ] Node.js ≥ 18 (local builds / scripts only)
- [ ] Railway backend already live — `curl` health succeeds
- [ ] Same Supabase project the student app uses
- [ ] An allowlisted admin user (email matches `ADMIN_ALLOWED_EMAIL`, role `admin` or `super_admin`)

Verify the API:

```bash
curl -fsS https://adequate-surprise-production-96bc.up.railway.app/health
```

Replace the hostname with your Railway public URL if it differs (Railway → service → Networking).

---

## Step 1 — Railway prep

Railway → **bandforge-api** (or your API service) → **Variables**.

### Required for admin

```env
ADMIN_ALLOWED_EMAIL=product@matalabs.io
```

Must match the value you set on Vercel (fail-closed if unset or mismatched).

### After you know the admin Vercel URL

Keep student `FRONTEND_URL` pointing at the **student** app. Add the admin origin to **`CORS_ORIGINS`** so both frontends are allowed when anything hits Railway from the browser (tools, edge cases):

```env
# Student app stays as FRONTEND_URL
FRONTEND_URL=https://bandforge-web.vercel.app

# Comma-separated extras — include admin production (and previews if needed)
CORS_ORIGINS=https://<your-admin-project>.vercel.app
```

With a custom domain later:

```env
CORS_ORIGINS=https://admin.matalabs.io,https://<your-admin-project>.vercel.app
```

Redeploy Railway after changing variables if your setup does not hot-reload env.

### Confirm admin API is mounted

Health alone is enough to prove the process is up. Admin routes require auth; a `401`/`403` from `/admin/...` (not `404`) means the router is mounted.

---

## Step 2 — Create the Vercel project

1. [Vercel Dashboard](https://vercel.com) → **Add New…** → **Project** → import the **MATA-lab** (or BandForge) monorepo.
2. **Root Directory:** `admin/web`  
   - Do **not** use `admin/` — the root `admin/package.json` only forwards scripts; the Next app lives in `web/`.
3. Framework Preset: **Next.js** (auto-detected).
4. Build settings (defaults are fine):

   | Setting | Value |
   |---------|--------|
   | Install Command | `npm install` |
   | Build Command | `npm run build` |
   | Output | Next.js default |

5. Do **not** add a `vercel.json` unless you later need custom timeouts; body size for listening uploads is already raised in `admin/web/next.config.ts` (`proxyClientMaxBodySize: "50mb"`).

Create the project but set env vars **before** the first successful production deploy (next step).

---

## Step 3 — Environment variables (Production + Preview)

Vercel → project → **Settings** → **Environment Variables**.

Apply to **Production** and **Preview** (recommended so preview deploys can reach the API):

| Variable | Example value | Notes |
|----------|---------------|--------|
| `API_URL` | `https://adequate-surprise-production-96bc.up.railway.app` | **Preferred.** Runtime on Vercel; can fix without rebuilding. No trailing slash. |
| `NEXT_PUBLIC_API_URL` | same Railway URL | Build-time fallback; keep in sync with `API_URL`. |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` | Required for middleware / session gates. |
| `ADMIN_ALLOWED_EMAIL` | `product@matalabs.io` | Must match Railway. |

Rules:

- Never set `API_URL` / `NEXT_PUBLIC_API_URL` to `localhost` or `127.0.0.1` on Vercel.
- Prefer changing `API_URL` if the Railway hostname moves — `admin/web/lib/api.ts` reads it at runtime when `VERCEL=1`.
- After changing **`NEXT_PUBLIC_*`** vars, **Redeploy** so the new values are baked in.
- Changing only **`API_URL`** often works on the next request without a rebuild, but redeploy if proxies still look wrong.

Copy-paste block:

```env
API_URL=https://adequate-surprise-production-96bc.up.railway.app
NEXT_PUBLIC_API_URL=https://adequate-surprise-production-96bc.up.railway.app
NEXT_PUBLIC_AUTH_ENABLED=true
ADMIN_ALLOWED_EMAIL=product@matalabs.io
```

---

## Step 4 — Deploy

1. Trigger **Deploy** (or push to the connected branch).
2. Open `https://<your-admin-project>.vercel.app/admin/login`.
3. Copy the production URL into Railway `CORS_ORIGINS` if you have not already (Step 1).

### Optional custom domain

1. Vercel → **Domains** → add e.g. `admin.matalabs.io` and follow DNS instructions.
2. Update Railway:

   ```env
   CORS_ORIGINS=https://admin.matalabs.io
   ```

3. Login and cookies stay on the custom host; no shared cookie domain with the student app.

---

## Step 5 — Bootstrap / promote admin user

The UI only admits users who:

1. Exist in Supabase (via backend auth),
2. Have role `admin` or `super_admin`,
3. Match `ADMIN_ALLOWED_EMAIL` on **both** Railway and Vercel.

From a machine with backend env / Supabase credentials:

```bash
cd backend
source .venv/bin/activate
python scripts/bootstrap_admin_user.py
# or promote an existing user:
python scripts/promote_admin.py
# same scripts also live under admin/scripts/
```

Use the email you set in `ADMIN_ALLOWED_EMAIL`. Admin login is **email/password** at `/admin/login` (not Google as the primary path).

---

## Step 6 — Post-deploy verification checklist

| # | Test | Pass when |
|---|------|-----------|
| 1 | `curl -fsS <RAILWAY>/health` | `{"status":"ok"}` (or equivalent ok payload) |
| 2 | Open `/admin/login` | Login form loads (no blank 500) |
| 3 | Sign in with a **non-allowlisted** account | Denied / no admin session |
| 4 | Sign in with allowlisted admin | Redirect to `/admin`; dashboard KPIs load |
| 5 | DevTools → Application → Cookies | `bf_access` / `bf_refresh` on the **admin** host; `Secure` in production |
| 6 | `/admin/users`, `/admin/mocks`, `/admin/question-bank` | Lists load (or empty states, not proxy 503) |
| 7 | Listening audio upload (if used) | Upload ≤ ~50MB via `/api/admin/...` succeeds |
| 8 | Logout | Cookies cleared; revisit `/admin` → redirected to login |
| 9 | Preview deployment | Preview env has `API_URL`; login still works |

---

## Local vs production

| | Local | Production |
|--|--------|------------|
| UI | `admin/web` on `http://127.0.0.1:3001` | Vercel HTTPS |
| API | `uvicorn` on `:8000` | Railway public URL |
| Env file | `admin/web/.env.example` → `admin/web/.env.local` | Vercel project env |
| Docs | [LOCAL_SETUP.md](./LOCAL_SETUP.md) | this file |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| `503` / “API_URL missing” / cannot reach API | Env unset or points at localhost | Set `API_URL` (and `NEXT_PUBLIC_API_URL`) to the Railway URL on Production **and** Preview; redeploy if needed |
| Login loop / always back to `/admin/login` | Auth disabled or cookies not set | `NEXT_PUBLIC_AUTH_ENABLED=true`; use HTTPS (Secure cookies); check BFF `/api/auth/login` response |
| `403` after successful password login | Email ≠ allowlist or missing admin role | Sync `ADMIN_ALLOWED_EMAIL` on Railway + Vercel; run `promote_admin.py` / bootstrap |
| Build succeeds but all admin fetches fail | Railway down or wrong host | `curl /health`; confirm hostname matches Networking; legacy Railway hosts are remapped in `admin/web/lib/api.ts` |
| CORS error in browser | Something calling Railway directly, or origin missing | Prefer `/api/*` on Vercel only; add admin origin to Railway `CORS_ORIGINS` |
| Large MP3 upload truncated / fails | Body size limits | App allows 50MB via Next proxy; Vercel plan/function limits may still apply — use smaller files or upgrade plan if needed |
| `502` from Railway | Port mismatch | Public Networking port must match the process (often **8080**); see student Railway docs |
| `NXDOMAIN` / cannot resolve `*.railway.app` | Local DNS | Try Wi‑Fi DNS `1.1.1.1` / `8.8.8.8` |

---

## Quick copy-paste checklist

```text
Railway:
  [ ] curl /health OK
  [ ] ADMIN_ALLOWED_EMAIL=<same as Vercel>
  [ ] FRONTEND_URL= student app (unchanged)
  [ ] CORS_ORIGINS includes https://<admin>.vercel.app (and custom domain if any)
  [ ] JWT secrets not dev placeholders

Vercel (Root Directory = admin/web):
  [ ] API_URL=https://<railway>.up.railway.app
  [ ] NEXT_PUBLIC_API_URL= same
  [ ] NEXT_PUBLIC_AUTH_ENABLED=true
  [ ] ADMIN_ALLOWED_EMAIL=<same as Railway>
  [ ] Env on Production + Preview
  [ ] Deploy succeeded → /admin/login loads

Admin user:
  [ ] bootstrap_admin_user.py or promote_admin.py
  [ ] role admin/super_admin + allowlisted email

Manual smoke:
  [ ] Allowlisted login → /admin dashboard
  [ ] Users / mocks / question-bank load
  [ ] Logout clears session
```
