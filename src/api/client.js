const BASE = '/api';

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
    const res = await fetch(BASE + path, { headers: headers(auth) });
    return handleRes(res);
  },
  async post(path, body, auth = true) {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async put(path, body, auth = true) {
    const res = await fetch(BASE + path, {
      method: 'PUT',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async patch(path, body, auth = true) {
    const res = await fetch(BASE + path, {
      method: 'PATCH',
      headers: headers(auth),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleRes(res);
  },
  async delete(path, auth = true) {
    const res = await fetch(BASE + path, { method: 'DELETE', headers: headers(auth) });
    if (res.status === 204) return;
    return handleRes(res);
  },
};

export default api;
