import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import { Plus, Dumbbell, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

function formatSessionDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: workouts = [], isLoading } = useQuery('workouts', () => api.get('/workouts'));
  const { data: sessions = [] } = useQuery('sessions', () => api.get('/sessions'));
  const lastSession = sessions
    .filter((s) => s.ended_at)
    .sort((a, b) => (b.ended_at || 0) - (a.ended_at || 0))[0] ?? null;

  const [ordered, setOrdered] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    setOrdered(workouts);
  }, [workouts]);

  const reorderMutation = useMutation(
    (ids) => api.put('/workouts/order', { ids }),
    {
      onError: () => {
        // Refetch on error to restore server order.
        queryClient.invalidateQueries('workouts');
      },
    }
  );

  const handleDragStart = useCallback((id) => {
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback(
    (event, targetId) => {
      event.preventDefault();
      if (!draggingId || draggingId === targetId) return;
      setOrdered((prev) => {
        const current = [...prev];
        const fromIndex = current.findIndex((w) => w.id === draggingId);
        const toIndex = current.findIndex((w) => w.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return prev;
        const [moved] = current.splice(fromIndex, 1);
        current.splice(toIndex, 0, moved);
        return current;
      });
    },
    [draggingId]
  );

  const handleDragEnd = useCallback(() => {
    if (!draggingId) return;
    setDraggingId(null);
    reorderMutation.mutate(ordered.map((w) => w.id));
  }, [draggingId, ordered, reorderMutation]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 font-mono">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Your routines. Your gains.</p>
        </div>
        <Link
          to="/workout/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg transition-all gain-glow hover:shadow-lg hover:shadow-gain-500/20"
        >
          <Plus className="w-5 h-5" />
          New routine
        </Link>
      </motion.div>

      {lastSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-slab-850 bg-slab-900/80 px-4 py-3"
        >
          <p className="text-sm text-zinc-400 font-mono">
            Last session: <span className="text-zinc-200">{lastSession.workout_name}</span>
            <span className="text-zinc-500"> — ended {formatSessionDate(lastSession.ended_at)}</span>
          </p>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slab-900 border border-slab-850 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-12 text-center"
        >
          <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">No routines yet</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
            Create your first workout routine—Leg Day, Push Day, or whatever fits your program.
          </p>
          <Link
            to="/workout/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Create routine
          </Link>
        </motion.div>
      ) : (
        <div className="dashboard-grid">
          {ordered.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                draggable
                onDragStart={() => handleDragStart(w.id)}
                onDragOver={(e) => handleDragOver(e, w.id)}
                onDragEnd={handleDragEnd}
                to={`/workout/${w.id}`}
                className="block bg-slab-900 border border-slab-850 rounded-xl p-5 hover:border-gain-500/40 hover:bg-slab-850/50 transition-all group cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-100 group-hover:text-gain-400 transition-colors">
                      {w.name}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5 font-mono">
                      {w.exercise_count ?? 0} exercises
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-gain-500 transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
