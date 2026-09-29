import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  api,
  getApiBase,
  fetchWithTimeout,
  wakeBackend,
  AUTH_TIMEOUT_MS,
  AUTH_RETRY_TIMEOUT_MS,
  WAKE_TIMEOUT_MS,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const path = location.pathname || '';
    if (path === '/login' || path === '/register') {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get('/auth/me');
      setUser(me);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const postAuth = useCallback(async (path, payload, ms) => {
    return fetchWithTimeout(`${getApiBase()}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, ms);
  }, []);

  const authRequest = useCallback(async (path, email, password, extra = {}) => {
    const payload = { email, password, ...extra };
    let res;
    try {
      res = await postAuth(path, payload, AUTH_TIMEOUT_MS);
    } catch {
      await wakeBackend(WAKE_TIMEOUT_MS);
      res = await postAuth(path, payload, AUTH_RETRY_TIMEOUT_MS);
    }
    if (res.status === 503) {
      await wakeBackend(WAKE_TIMEOUT_MS);
      res = await postAuth(path, payload, AUTH_RETRY_TIMEOUT_MS);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...data };
    const { token, ...u } = data;
    if (!token) throw { status: 0, error: 'Cannot reach the server.' };
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  }, [postAuth]);

  const login = useCallback(
    (email, password) => authRequest('login', email, password),
    [authRequest]
  );

  const register = useCallback(
    (email, password, extra = {}) => authRequest('register', email, password, extra),
    [authRequest]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
