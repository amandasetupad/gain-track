// --- Sign-up / API URL fix ---
const GAINTRACK_BUILD = '2024-03-signup-fix-v1';
if (typeof window !== 'undefined') {
  console.log('[GainTrack]', GAINTRACK_BUILD, '— if you see this, the latest build is loaded. If sign-up still fails, check that the POST request in Network tab goes to https://gain-track.onrender.com');
}
const PRODUCTION_BACKEND_URL = 'https://gain-track.onrender.com';
const API_PATH = '/api';
const DEBUG = true;

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
    if (res.status === 401 && typeof window !== 'undefined') {
      const u = requestUrl || res.url || '';
      if (!u.includes('/auth/login') && !u.includes('/auth/register')) {
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
