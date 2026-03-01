# Deploy checklist (Vercel + Render)

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
