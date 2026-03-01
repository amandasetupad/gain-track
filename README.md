# GainTrack — Log. Lift. Progress.

A modern, responsive workout tracking web app with account-based persistence, real-time session logging, progress charts, and shareable workout links.

## Features

- **Workout management** — Create custom routines (e.g. Leg Day, Push Day) with a dynamic list of exercises
- **Real-time logging** — Track sets, reps, and weight for each exercise during a session
- **Progress visualization** — History view with interactive Recharts for strength gains over time per exercise
- **Workout sharing** — Copy unique links to share routines with friends or trainers
- **Modern UI** — Technical dashboard aesthetic with Tailwind CSS, Framer Motion, and Lucide icons

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Recharts, React Query, React Router
- **Backend:** Express, SQLite (better-sqlite3), JWT auth, bcrypt

## Setup

```bash
# Install dependencies
npm install

# Start dev (client + API)
npm run dev
```

- **Frontend:** http://localhost:5173  
- **API:** http://localhost:3001  

The database is created automatically on first run in `server/data/workouts.db`. To reset schema, delete that file and restart the server.

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Run frontend + backend         |
| `npm run dev:client` | Frontend only (Vite)    |
| `npm run dev:server` | Backend only (Express)  |
| `npm run build` | Production frontend build    |
| `npm run db:init` | Initialize DB (optional)   |

## Deploying: Fix "404" on Register / Login (Vercel)

If your app is live on Vercel (e.g. `no-gain-no-pain.vercel.app`) and **Register** or **Login** returns **404**, the frontend is calling `/api` on the same domain. Vercel only hosts the React app; the Express backend is not there.

**Do this:**

1. **Deploy the backend** to [Render](https://render.com) (or another host): connect your repo, choose "Web Service", set build to `npm install` and start to `node server/index.js`, add env vars `CORS_ORIGIN` and `JWT_SECRET`, then deploy. Copy the service URL (e.g. `https://gain-track-api.onrender.com`).
2. **In Vercel:** open your project → **Settings** → **Environment Variables**. Add:
   - **Name:** `VITE_API_URL`  
   - **Value:** your backend URL, e.g. `https://gain-track-api.onrender.com` (no trailing slash).
3. **Redeploy** the Vercel project (e.g. trigger a new deployment from the Deployments tab). Vite bakes `VITE_API_URL` at build time, so a new build is required after adding it.

After that, the live site will call your Render backend for auth and data instead of Vercel, and registration will work.

## Environment

**Frontend (Vercel)** — add in Project → Settings → Environment Variables:

- `VITE_API_URL` — Your backend URL, e.g. `https://your-app-api.onrender.com`. Must be **HTTPS** in production (Vercel is HTTPS; mixed content is blocked). Leave unset in dev (Vite proxies `/api` to the backend).

**Backend (Render)** — add in Service → Environment:

- `CORS_ORIGIN` — Your Vercel frontend URL, e.g. `https://your-workout-site.vercel.app`. Comma-separated for multiple origins.
- `JWT_SECRET` — Strong secret for JWT (required in production).
- `PORT` — Set automatically by Render; optional locally (default `3001`).

See `.env.example` for a template.

## Share links

Shared workouts are public. Example: `https://yoursite.com/share/leg-day-abc123`. Anyone with the link can view the routine; sign in to save it to their account (clone flow can be added later).
