import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MSG_BACKEND_NOT_CONFIGURED, MSG_BACKEND_UNAVAILABLE, wakeBackend } from '../api/client';
import Footer from '../components/Footer';

const isBackendConfigured = () =>
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.length > 0;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastSubmitAt = useRef(0);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    wakeBackend();
  }, []);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const now = Date.now();
    if (now - lastSubmitAt.current < 3000) {
      setError('Please wait a moment and try again.');
      return;
    }
    lastSubmitAt.current = now;
    setLoading(true);
    try {
      await register(email, password, { website });
      navigate('/');
    } catch (err) {
      const backendMsg = MSG_BACKEND_NOT_CONFIGURED;
      setError(
        err.status === 0 || err.status === 503
          ? MSG_BACKEND_UNAVAILABLE
          : err.status === 404 || (import.meta.env.PROD && !isBackendConfigured())
            ? backendMsg
            : err.error || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slab-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            <Dumbbell className="w-8 h-8 text-gain-500" aria-hidden="true" />
            <span className="font-mono text-xl font-semibold text-zinc-100">GainTrack</span>
          </div>
          <div className="bg-slab-900 border border-slab-850 rounded-xl p-6 shadow-xl">
            {import.meta.env.PROD && !isBackendConfigured() && (
              <div className="mb-4 flex gap-2 rounded-lg bg-amber-500/15 border border-amber-500/40 p-3 text-amber-200 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{MSG_BACKEND_NOT_CONFIGURED}</p>
              </div>
            )}
            <h1 className="text-lg font-semibold text-zinc-100 mb-6">Create account</h1>
            <form onSubmit={handleSubmit} className="relative space-y-4">
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="absolute left-0 top-0 -z-10 h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                <label htmlFor="register-website">Website</label>
                <input
                  id="register-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-400 focus:border-gain-500 focus:ring-1 focus:ring-gain-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden />
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-400 focus:border-gain-500 focus:ring-1 focus:ring-gain-500 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg transition-colors disabled:opacity-70"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? (slow ? 'Waking server…' : 'Creating...') : 'Sign up'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="text-gain-400 hover:text-gain-300 font-medium">
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-zinc-400">
              By signing up you agree to the{' '}
              <Link to="/terms" className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline">
                Terms
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
