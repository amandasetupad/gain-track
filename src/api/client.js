// --- Sign-up / API URL fix ---
const GAINTRACK_BUILD = '2024-03-signup-fix-v1';
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('[GainTrack]', GAINTRACK_BUILD, '— if you see this, the latest build is loaded. If sign-up still fails, check that the POST request in Network tab goes to https://gain-track.onrender.com');
}
const PRODUCTION_BACKEND_URL = 'https://gain-track.onrender.com';
const API_PATH = '/api';
const DEBUG = import.meta.env.DEV;

function getBase() {
  if (typeof window === 'undefined') return PRODUCTION_BACKEND_URL + API_PATH;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return API_PATH;
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return `${String(fromEnv).replace(/\/$/, '')}${API_PATH}`;
  }
  return `${PRODUCTION_BACKEND_URL.replace(/\/$/, '')}${API_PATH}`;
}

if (typeof window !== 'undefined' && DEBUG) {
  const base = getBase();
  console.log('[GainTrack] API base URL:', base);
  console.log('[GainTrack] Current origin:', window.location.origin);
  console.log('[GainTrack] If sign-up fails, requests must go to', PRODUCTION_BACKEND_URL + API_PATH, '— check Network tab for the actual request URL.');
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

export const MSG_BACKEND_WAKING =
  'Waking the server… Render’s free tier can take about a minute after idle. Hang on.';

export const MSG_BACKEND_UNAVAILABLE =
  'Cannot reach the server. The backend may still be waking up (about a minute on Render’s free tier) or it may be down. Wait and try again.';

export const AUTH_TIMEOUT_MS = 25_000;
export const WAKE_TIMEOUT_MS = 75_000;
export const AUTH_RETRY_TIMEOUT_MS = 35_000;

export function getApiBase() {
  return getBase();
}

export async function fetchWithTimeout(url, options = {}, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    throw {
      status: 0,
      error: MSG_BACKEND_UNAVAILABLE,
      timeout: err?.name === 'AbortError',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Ping /health to wake a sleeping Render instance. Resolves true if the process answered. */
export async function wakeBackend(ms = WAKE_TIMEOUT_MS) {
  try {
    const res = await fetchWithTimeout(`${getBase()}/health`, { method: 'GET' }, ms);
    return res.ok || res.status === 503;
  } catch {
    return false;
  }
}

async function handleRes(res, requestUrl = '') {
  const data = await res.json().catch(() => ({}));
  if (DEBUG && typeof window !== 'undefined' && !res.ok) {
    console.error('[GainTrack] Request failed:', {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      body: data,
    });
    if (res.status === 404) {
      console.error('[GainTrack] 404 = backend not found. If url is your Vercel domain, the app is calling the wrong server. It should be', PRODUCTION_BACKEND_URL);
    }
  }
  if (!res.ok) {
    // Only auto-logout on 401 for the auth \"me\" check.
    // For other endpoints (workouts, sessions, etc.) we surface the error but keep the user in place.
    if (res.status === 401 && typeof window !== 'undefined') {
      const u = requestUrl || res.url || '';
      if (u.includes('/auth/me')) {
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    const err = { status: res.status, ...data };
    if (res.status === 404) err.error = MSG_BACKEND_NOT_CONFIGURED;
    throw err;
  }
  return data;
}

export const api = {
  async get(path, auth = true) {
    const url = getBase() + path;
    if (DEBUG && typeof window !== 'undefined') console.log('[GainTrack] GET', url);
    const res = await fetch(url, { headers: headers(auth) });
    return handleRes(res, url);
  },
  async post(path, body, auth = true) {
    const url = getBase() + path;
    if (DEBUG && typeof window !== 'undefined') console.log('[GainTrack] POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res, url);
  },
  async put(path, body, auth = true) {
    const url = getBase() + path;
    if (DEBUG && typeof window !== 'undefined') console.log('[GainTrack] PUT', url);
    const res = await fetch(url, {
      method: 'PUT',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res, url);
  },
  async patch(path, body, auth = true) {
    const url = getBase() + path;
    if (DEBUG && typeof window !== 'undefined') console.log('[GainTrack] PATCH', url);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res, url);
  },
  async delete(path, auth = true) {
    const url = getBase() + path;
    if (DEBUG && typeof window !== 'undefined') console.log('[GainTrack] DELETE', url);
    const res = await fetch(url, { method: 'DELETE', headers: headers(auth) });
    if (res.status === 204) return;
    return handleRes(res, url);
  },
};

export default api;
