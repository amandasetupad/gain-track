# Deploy checklist (Vercel + Render)

## Permanent setup (stop losing data)

Data keeps disappearing when the backend uses **ephemeral SQLite** instead of **PostgreSQL**. After the latest code deploy:

### 1. Render environment (gain-track web service)

Set these **once** and do not change unless you mean to reset data:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | From **gain-track-db** → **Info** → **Internal Database URL** (must start with `postgresql://`) |
| `JWT_SECRET` | A long random string — **set once**, never regenerate on redeploy |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://gain-track-two.vercel.app` |

Link the Postgres database to the web service in Render (Connections) so `DATABASE_URL` stays in sync.

### 2. Verify after every deploy

Open **https://gain-track.onrender.com/api/health** — must show:

```json
{"ok":true,"db":"postgres"}
```

If you see `"db":"sqlite"` or a `warning` field, **data is not persistent** — fix `DATABASE_URL` before using the app.

In Render **Logs**, confirm: `Using PostgreSQL (DATABASE_URL)` — never `Falling back to SQLite`.

### 3. Login email

Use the **exact email** you registered with. `amanda@gmail.com` and `pipare.amanda@gmail.com` are different accounts.

---

## Render crash: "Exited with status 1"

If Render shows **Instance failed / Exited with status 1**, the backend crashed during startup — usually because **`DATABASE_URL`** is set but PostgreSQL cannot connect (wrong URL, database suspended, or network issue).

The server **no longer falls back to empty SQLite** when `DATABASE_URL` is set — it fails loudly so you know immediately.

**After pushing the latest code:**

1. Render should auto-redeploy from `amandasetupad/gain-track` (main).
2. Open **https://gain-track.onrender.com/api/health** — expect `{"ok":true,"db":"postgres"}`.
3. In Render → **gain-track** → **Logs**, confirm `Using PostgreSQL (DATABASE_URL)`.

**Fix PostgreSQL:**

- Render → **gain-track-db** → confirm database is **Available** (free tier suspends after 90 days inactivity).
- Render → **gain-track** → **Environment** → set **DATABASE_URL** to PostgreSQL **Internal Database URL**.

**Redeploy frontend (Vercel):** push triggers redeploy, or manually redeploy **gain-track-two**.

**Lost account or workouts?** See **[RECOVERY.md](./RECOVERY.md)**.

---

## If sign-up still fails and you don't see `[GainTrack]` in the Console

Your live site is likely serving an **old build**. Force a fresh deploy:

### 1. Force redeploy on Vercel

1. Go to [vercel.com](https://vercel.com) → your project **no-gain-no-pain**.
2. Open the **Deployments** tab.
3. Find the **latest** deployment (top of the list).
4. Click the **⋮** (three dots) on that row.
5. Click **Redeploy**.
6. Optionally enable **Clear build cache** so the new build is completely fresh.
7. Wait for the deployment to finish (status: Ready).

### 2. Confirm the new build is live

1. Open your site: **https://no-gain-no-pain.vercel.app**
2. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows), or use a **private/incognito** window.
3. Open **Developer Tools** (F12) → **Console** tab.
4. You should see a line like:  
   `[GainTrack] 2024-03-signup-fix-v1 — if you see this...`
5. If you **don’t** see that line, the browser is still loading an old cached bundle. Try again in incognito or after clearing site data for no-gain-no-pain.vercel.app.

### 3. Check where the request goes

1. In DevTools open the **Network** tab.
2. Try **Sign up** again.
3. Click the red **register** (or **auth/register**) request.
4. The **Request URL** must be:  
   `https://gain-track.onrender.com/api/auth/register`  
   If it is **https://no-gain-no-pain.vercel.app/api/...**, the old build is still running; redeploy and hard refresh again.

### 4. Backend (Render)

- **CORS:** In Render → your service → **Environment**, set **CORS_ORIGIN** = `https://no-gain-no-pain.vercel.app` (or leave unset; the server allows `*.vercel.app`).
- **Health check:** Open **https://gain-track.onrender.com/api/health** in a tab; you should see `{"ok":true}`.
