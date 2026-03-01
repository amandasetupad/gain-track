import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg =
        err.status === 404 && err.error
          ? err.error
          : err.error || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slab-950 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Dumbbell className="w-8 h-8 text-gain-500" />
          <span className="font-mono text-xl font-semibold text-zinc-100">GainTrack</span>
        </div>
        <div className="bg-slab-900 border border-slab-850 rounded-xl p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-zinc-100 mb-6">Sign in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-gain-500 focus:ring-1 focus:ring-gain-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-gain-500 focus:ring-1 focus:ring-gain-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            No account?{' '}
            <Link to="/register" className="text-gain-500 hover:text-gain-400 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
