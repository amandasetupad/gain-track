// In dev, Vite proxies /api to the backend. In production you MUST set VITE_API_URL to your
// Render (or other) backend URL, e.g. https://your-app.onrender.com — otherwise /api hits
// Vercel and returns 404 (no backend there).
const API_BASE = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
  : '/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL && typeof window !== 'undefined') {
  console.warn(
    'GainTrack: VITE_API_URL is not set. API calls will fail. Set it in Vercel → Settings → Environment Variables to your backend URL (e.g. https://your-app.onrender.com), then redeploy.'
  );
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

async function handleRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  async get(path, auth = true) {
    const res = await fetch(API_BASE + path, { headers: headers(auth) });
    return handleRes(res);
  },
  async post(path, body, auth = true) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async put(path, body, auth = true) {
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async patch(path, body, auth = true) {
    const res = await fetch(API_BASE + path, {
      method: 'PATCH',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async delete(path, auth = true) {
    const res = await fetch(API_BASE + path, { method: 'DELETE', headers: headers(auth) });
    if (res.status === 204) return;
    return handleRes(res);
  },
};

export default api;
