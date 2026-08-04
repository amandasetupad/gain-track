# Data recovery guide

If you lost your account or workouts after the Render backend crash, follow these steps **in order**.

## What happened

1. Render had **`DATABASE_URL`** set (PostgreSQL), but the app **could not connect** (missing SSL / bad URL).
2. The server **crashed on startup** (`Exited with status 1`).
3. After the fix, the server **fell back to a fresh SQLite database** on Render’s ephemeral disk.
4. That temporary database has **no connection to your old data**.

Your workout data was **never stored on your Mac** (local `server/data/workouts.db` only has your account email, zero workouts). Production data lived on **Render only**.

---

## Step 1: Check Render PostgreSQL (best chance of recovery)

Your workouts are **most likely still in Render PostgreSQL** if you ever created a Postgres database and set `DATABASE_URL`.

### A. Find your PostgreSQL database

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Look in the left sidebar for **PostgreSQL** (separate from the **gain-track** web service)
3. If you see a database (e.g. `gain-track-db` or similar), click it → **Info** tab

### B. If PostgreSQL exists

1. Copy the **Internal Database URL** (starts with `postgresql://...`)
2. Open the **gain-track** web service → **Environment**
3. Set **`DATABASE_URL`** = that Internal Database URL (replace any old value)
4. Ensure these are also set:
   - **`NODE_ENV`** = `production`
   - **`JWT_SECRET`** = any strong secret (keep the existing value if login worked before)
   - **`CORS_ORIGIN`** = `https://gain-track-two.vercel.app`
5. **Manual Deploy** the gain-track service (or push latest code from GitHub)
6. Open **Logs** and confirm you see:
   ```
   Using PostgreSQL (DATABASE_URL)
   Server running on port ...
   ```
   **NOT** `Falling back to SQLite...`

### C. Verify your data is there

From your Mac (replace with your Internal Database URL):

```bash
cd "/Users/amandapipare/Desktop/Workout website"
DATABASE_URL="postgresql://..." node server/scripts/inspect-db.js
```

You should see your email, workouts, sessions, and log counts.

### D. Log in

Go to https://gain-track-two.vercel.app/login and sign in with your **original email and password**. If PostgreSQL had your account, it will work and all routines/sessions return.

---

## Step 2: If PostgreSQL does not exist or is empty

### Render ephemeral SQLite (gone)

Data that lived only on Render’s local disk (when PostgreSQL was never connected) is **not recoverable** after redeploys/restarts. Render free tier does not keep disk backups.

### Local backup (partial)

Your Mac has `server/data/workouts.db` with:

| Data | Status |
|------|--------|
| Account `pipare.amanda@gmail.com` | Present (password hash preserved) |
| Workouts / sessions / progress | **None** (never saved locally) |

To restore **only the account** to production PostgreSQL:

```bash
cd "/Users/amandapipare/Desktop/Workout website"
DATABASE_URL="postgresql://YOUR_INTERNAL_URL" node server/scripts/migrate-sqlite-to-pg.js
```

Then redeploy Render. You can log in with your **original password** — but you will still need to recreate workouts manually.

---

## Step 3: Prevent this from happening again

1. **Always use PostgreSQL in production** — create a Render PostgreSQL database and set `DATABASE_URL` to the **Internal Database URL**.
2. After deploy, check logs for `Using PostgreSQL (DATABASE_URL)` — never `Falling back to SQLite`.
3. The latest code includes SSL support for Render Postgres; keep the repo up to date on `main`.

---

## Quick reference

| Source | Account recoverable? | Workouts recoverable? |
|--------|---------------------|----------------------|
| Render PostgreSQL (if it exists & has data) | Yes | Yes |
| Render ephemeral SQLite | No | No |
| Local `workouts.db` | Yes (migrate script) | No (empty) |
| Git / GitHub | No (db is gitignored) | No |

---

## Need help?

Run the inspector locally and share the output (redact passwords/URLs):

```bash
node server/scripts/inspect-db.js
DATABASE_URL="postgresql://..." node server/scripts/inspect-db.js
```

If PostgreSQL shows your workouts, fixing `DATABASE_URL` and redeploying is all you need.
