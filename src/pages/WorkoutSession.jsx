import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Check, StopCircle } from 'lucide-react';
import { api } from '../api/client';

export default function WorkoutSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState({}); // exerciseId -> [{ set_index, reps, weight_kg }]

  const { data: workout, isLoading } = useQuery(
    ['workout', id],
    () => api.get(`/workouts/${id}`),
    { enabled: !!id && id !== 'new' }
  );

  const startSessionMutation = useMutation(
    () => api.post('/sessions', { workoutId: id }),
    {
      onSuccess: (data) => setSessionId(data.id),
    }
  );

  const endSessionMutation = useMutation(
    () => api.patch(`/sessions/${sessionId}/end`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workouts');
        queryClient.invalidateQueries(['workout', id]);
        navigate(`/workout/${id}`);
      },
    }
  );

  const logMutation = useMutation(
    (body) => api.post(`/sessions/${sessionId}/logs`, body),
    { onSuccess: () => queryClient.invalidateQueries(['session', sessionId]) }
  );

  React.useEffect(() => {
    if (workout?.id && !sessionId && !startSessionMutation.isLoading) {
      startSessionMutation.mutate();
    }
  }, [workout?.id, sessionId]);

  const addSet = useCallback(
    (exerciseId, exerciseName) => {
      const list = logs[exerciseId] || [];
      const setIndex = list.length;
      setLogs((prev) => ({
        ...prev,
        [exerciseId]: [...list, { set_index: setIndex, reps: '', weight_kg: '' }],
      }));
    },
    [logs]
  );

  const updateSet = useCallback((exerciseId, setIndex, field, value) => {
    setLogs((prev) => {
      const list = [...(prev[exerciseId] || [])];
      if (!list[setIndex]) list[setIndex] = { set_index: setIndex, reps: '', weight_kg: '' };
      list[setIndex] = { ...list[setIndex], [field]: value };
      return { ...prev, [exerciseId]: list };
    });
  }, []);

  const saveSet = useCallback(
    (exerciseId, exerciseName, setIndex, reps, weight_kg) => {
      if (!sessionId) return;
      logMutation.mutate({
        workout_exercise_id: exerciseId,
        exercise_name: exerciseName,
        set_index: setIndex,
        reps: reps ? parseInt(reps, 10) : null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      });
    },
    [sessionId, logMutation]
  );

  if (isLoading || !workout) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gain-500 font-mono">Loading...</div>
      </div>
    );
  }

  const exercises = workout.exercises || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/workout/${id}`}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">Back</span>
        </Link>
        <h1 className="text-xl font-bold text-zinc-100 font-mono truncate">
          {workout.name} — Session
        </h1>
        <span className="w-24" aria-hidden />
      </div>

      {!sessionId && (
        <p className="text-amber-400/90 text-sm font-mono">Starting session…</p>
      )}

      {logMutation.isError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 text-sm font-mono">
          {logMutation.error?.error || logMutation.error?.message || 'Failed to save set'}
        </div>
      )}

      <div className="space-y-6">
        <AnimatePresence>
          {exercises.map((ex, idx) => (
            <motion.section
              key={ex.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-slab-900 border border-slab-850 rounded-xl p-5"
            >
              <h2 className="font-semibold text-zinc-100 mb-4 font-mono">{ex.name}</h2>
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] sm:grid-cols-[minmax(4rem,auto)_5rem_5rem_auto] items-center gap-x-3 gap-y-1 text-zinc-500 text-xs font-mono uppercase tracking-wider pb-1 border-b border-slab-850">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span aria-hidden />
                </div>
                {(logs[ex.id] || []).map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 border-b border-slab-850 last:border-0"
                  >
                    <span className="text-zinc-500 text-sm font-mono w-8">Set {setIdx + 1}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Reps"
                      aria-label="Reps"
                      value={set.reps ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'reps', e.target.value)}
                      className="w-20 px-3 py-1.5 bg-slab-850 border border-slab-850 rounded text-zinc-100 font-mono text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="kg"
                      aria-label="Weight (kg)"
                      value={set.weight_kg ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'weight_kg', e.target.value)}
                      className="w-20 px-3 py-1.5 bg-slab-850 border border-slab-850 rounded text-zinc-100 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
                      disabled={!sessionId || logMutation.isLoading}
                      className="p-1.5 rounded bg-gain-500/20 text-gain-400 hover:bg-gain-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save set"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(ex.id, ex.name)}
                  className="flex items-center gap-2 text-sm text-gain-500 hover:text-gain-400 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add set
                </button>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>

      <div className="pt-6 border-t border-slab-850 flex justify-center sm:justify-end pb-8">
        <button
          onClick={() => endSessionMutation.mutate()}
          disabled={endSessionMutation.isLoading}
          className="flex items-center gap-2 px-6 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-mono text-sm"
        >
          <StopCircle className="w-5 h-5" />
          End session
        </button>
      </div>
    </div>
  );
}
