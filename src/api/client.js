// --- Sign-up / API URL fix ---
// In production, the app must call your live backend (e.g. on Render), not Vercel.
// Option 1 (recommended): In Vercel → Settings → Environment Variables, add:
//   VITE_API_URL = https://your-backend-name.onrender.com
// Then redeploy so the build picks it up.
// Option 2: Replace the URL below with your actual Render backend URL and push to GitHub.
const PRODUCTION_BACKEND_URL = 'https://gain-track.onrender.com';

function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return `${String(fromEnv).replace(/\/$/, '')}/api`;
  }
  if (import.meta.env.PROD) {
    return `${PRODUCTION_BACKEND_URL.replace(/\/$/, '')}/api`;
  }
  return '/api'; // dev: Vite proxy forwards to backend
}

// When the app is on Vercel, always use the Render backend (fixes 404 for sign up / log in)
function resolveApiBase() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return `${PRODUCTION_BACKEND_URL.replace(/\/$/, '')}/api`;
  }
  return getApiBase();
}

const getBase = () => resolveApiBase();

// Log API base once so you can confirm in Console that we're calling Render, not Vercel
if (typeof window !== 'undefined') {
  const base = getBase();
  if (base.startsWith('http')) {
    console.log('GainTrack API:', base);
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function headers(includeAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export const MSG_BACKEND_NOT_CONFIGURED =
  "Sign up won't work until the backend is set. In Vercel: add env var VITE_API_URL = your backend URL (e.g. https://your-app.onrender.com), then redeploy. Deploy the backend first (e.g. on Render.com).";

async function handleRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = { status: res.status, ...data };
    if (res.status === 404) err.error = MSG_BACKEND_NOT_CONFIGURED;
    throw err;
  }
  return data;
}

export const api = {
  async get(path, auth = true) {
    const res = await fetch(getBase() + path, { headers: headers(auth) });
    return handleRes(res);
  },
  async post(path, body, auth = true) {
    const res = await fetch(getBase() + path, {
      method: 'POST',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async put(path, body, auth = true) {
    const res = await fetch(getBase() + path, {
      method: 'PUT',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async patch(path, body, auth = true) {
    const res = await fetch(getBase() + path, {
      method: 'PATCH',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async delete(path, auth = true) {
    const res = await fetch(getBase() + path, { method: 'DELETE', headers: headers(auth) });
    if (res.status === 204) return;
    return handleRes(res);
  },
};

export default api;
