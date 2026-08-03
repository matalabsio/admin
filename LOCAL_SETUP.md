# BandForge Admin — Local Setup

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

## Steps

1. **Navigate to the admin directory**

   ```bash
   cd admin
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   # Or: cd web && npm install
   ```

3. **Create environment file**

   Copy the example from `web/` and adjust values if needed:

   ```bash
   cp web/.env.example web/.env.local
   ```

   Default contents (see [`web/.env.example`](./web/.env.example)):

   | Variable | Default | Purpose |
   |----------|---------|---------|
   | `API_URL` | `http://127.0.0.1:8000` | Backend API (server-side) |
   | `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Backend API (client-side) |
   | `NEXT_PUBLIC_AUTH_ENABLED` | `true` | Toggle auth |
   | `ADMIN_ALLOWED_EMAIL` | `product@matalabs.io` | Allowed admin email |

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app starts on **http://localhost:3001**.

5. **(Optional) Start the backend**

   The admin expects the FastAPI backend running at port 8000:

   ```bash
   cd ../backend
   source .venv/bin/activate
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

For production Vercel deploy, see **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)**.

## Common Issues

| Problem | Fix |
|---------|-----|
| Port 3001 already in use | Kill the existing process: `lsof -ti:3001 \| xargs kill -9` then re-run |
| Backend connection errors | Ensure FastAPI is running on port 8000 |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3001) |
| `npm run build` | Production build |
| `npm run start` | Start production server (port 3001) |
| `npm run lint` | Run ESLint |
