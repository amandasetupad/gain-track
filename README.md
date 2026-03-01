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
