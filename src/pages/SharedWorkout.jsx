import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Copy, Check, Dumbbell, LogIn } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SharedWorkout() {
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: workout, isLoading, error } = useQuery(
    ['shared', slug],
    () => api.get(`/share/workout/${slug}`, true),
    { retry: false }
  );

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveMutation = useMutation(
    () => api.post(`/share/workout/${slug}/save`),
    {
      onSuccess: (data) => {
        setSaveError(null);
        navigate(`/workout/${data.id}`);
      },
      onError: (err) => {
        setSaveError(err?.error || err?.message || 'Failed to save this workout to your routines.');
      },
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slab-950 flex items-center justify-center">
        <div className="animate-pulse text-gain-500 font-mono">Loading...</div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-slab-950 flex flex-col items-center justify-center px-4">
        <Dumbbell className="w-12 h-12 text-zinc-600 mb-4" />
        <h1 className="text-xl font-semibold text-zinc-300 mb-2">Workout not found</h1>
        <p className="text-zinc-500 text-sm mb-6">This link may be invalid or the workout was removed.</p>
        <Link to="/" className="text-gain-500 hover:text-gain-400 font-medium">
          Go to GainTrack
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slab-950">
      <header className="border-b border-slab-850 bg-slab-950/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gain-500 font-semibold">
            <Dumbbell className="w-6 h-6" />
            <span className="font-mono">GainTrack</span>
          </Link>
          {!user ? (
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          ) : (
            <span className="text-xs text-zinc-500 font-mono truncate max-w-[160px]">
              Signed in as {user.email}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-6"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 font-mono">{workout.name}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Shared workout</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slab-850 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-gain-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              {user && (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isLoading}
                  className="text-xs font-mono text-gain-400 hover:text-gain-300 disabled:opacity-60"
                >
                  {saveMutation.isLoading ? 'Saving…' : 'Save to my routines'}
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {(workout.exercises || []).map((ex, i) => (
              <li
                key={ex.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-slab-850/50 text-zinc-200 font-mono text-sm"
              >
                <span className="text-zinc-500 w-6">{i + 1}.</span>
                {ex.name}
              </li>
            ))}
          </ul>

          {workout.exercises?.length === 0 && (
            <p className="text-zinc-500 text-sm">No exercises in this routine.</p>
          )}

          {saveError && (
            <p className="mt-4 text-xs text-red-400 font-mono">{saveError}</p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
