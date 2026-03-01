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
  const [logs, setLogs] = useState({}); // exerciseId -> [{ set_index, reps, weight_kg, saved? }]
  const [isEnding, setIsEnding] = useState(false);

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
        queryClient.invalidateQueries('history-exercise-names');
        queryClient.invalidateQueries('sessions');
        navigate(`/workout/${id}`, {
          state: {
            message: 'Session ended. Your sets were saved. View reps & weight in Progress.',
            type: 'success',
          },
        });
      },
      onError: (err) => {
        if (err?.status === 404) {
          queryClient.invalidateQueries('workouts');
          queryClient.invalidateQueries(['workout', id]);
          navigate(`/workout/${id}`, { state: { message: 'Session ended or no longer found (e.g. after server restart).' } });
        }
      },
    }
  );

  const logMutation = useMutation(
    (body) => api.post(`/sessions/${sessionId}/logs`, body),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['session', sessionId]);
        const exId = variables.workout_exercise_id;
        const setIdx = variables.set_index;
        setLogs((prev) => ({
          ...prev,
          [exId]: (prev[exId] || []).map((s, i) =>
            i === setIdx ? { ...s, saved: true } : s
          ),
        }));
      },
    }
  );

  const exercises = workout?.exercises || [];

  React.useEffect(() => {
    if (workout?.id && !sessionId && !startSessionMutation.isLoading) {
      startSessionMutation.mutate();
    }
  }, [workout?.id, sessionId]);

  const addSet = useCallback(
    (exerciseId) => {
      const list = logs[exerciseId] || [];
      const setIndex = list.length;
      setLogs((prev) => ({
        ...prev,
        [exerciseId]: [...list, { set_index: setIndex, reps: '', weight_kg: '', saved: false }],
      }));
    },
    [logs]
  );

  const updateSet = useCallback((exerciseId, setIndex, field, value) => {
    setLogs((prev) => {
      const list = [...(prev[exerciseId] || [])];
      if (!list[setIndex]) list[setIndex] = { set_index: setIndex, reps: '', weight_kg: '', saved: false };
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
        reps: reps !== '' && reps != null ? parseInt(reps, 10) : null,
        weight_kg: weight_kg !== '' && weight_kg != null ? parseFloat(weight_kg) : null,
      });
    },
    [sessionId, logMutation]
  );

  const saveAllUnsavedSets = useCallback(async () => {
    if (!sessionId || !exercises.length) return;
    for (const ex of exercises) {
      const list = logs[ex.id] || [];
      for (let setIdx = 0; setIdx < list.length; setIdx++) {
        const set = list[setIdx];
        const hasData = (set.reps !== '' && set.reps != null) || (set.weight_kg !== '' && set.weight_kg != null);
        if (hasData && !set.saved) {
          await api.post(`/sessions/${sessionId}/logs`, {
            workout_exercise_id: ex.id,
            exercise_name: ex.name,
            set_index: setIdx,
            reps: set.reps !== '' && set.reps != null ? parseInt(set.reps, 10) : null,
            weight_kg: set.weight_kg !== '' && set.weight_kg != null ? parseFloat(set.weight_kg) : null,
          }).catch(() => {});
        }
      }
    }
  }, [sessionId, exercises, logs]);

  const handleEndSession = useCallback(async () => {
    if (isEnding || endSessionMutation.isLoading) return;
    setIsEnding(true);
    try {
      await saveAllUnsavedSets();
      endSessionMutation.mutate();
    } finally {
      setIsEnding(false);
    }
  }, [saveAllUnsavedSets, endSessionMutation, isEnding]);

  if (isLoading || !workout) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gain-500 font-mono">Loading...</div>
      </div>
    );
  }

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
              <div className="space-y-0">
                {/* Header and rows share the same grid so columns line up */}
                <div className="grid grid-cols-[4.5rem_5rem_5.5rem_2.5rem] sm:grid-cols-[5rem_6rem_6rem_3rem] items-center gap-x-3 sm:gap-x-4 text-zinc-500 text-xs font-mono uppercase tracking-wider pb-2 border-b border-slab-850">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span className="sr-only">Save</span>
                </div>
                {(logs[ex.id] || []).map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className="grid grid-cols-[4.5rem_5rem_5.5rem_2.5rem] sm:grid-cols-[5rem_6rem_6rem_3rem] items-center gap-x-3 sm:gap-x-4 py-2.5 border-b border-slab-850 last:border-0"
                  >
                    <span className="text-zinc-500 text-sm font-mono">Set {setIdx + 1}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      aria-label="Reps"
                      value={set.reps ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'reps', e.target.value)}
                      className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 bg-slab-850 border border-slab-850 rounded text-zinc-100 font-mono text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      aria-label="Weight (kg)"
                      value={set.weight_kg ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'weight_kg', e.target.value)}
                      className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 bg-slab-850 border border-slab-850 rounded text-zinc-100 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
                      disabled={!sessionId || logMutation.isLoading}
                      className="p-1.5 rounded bg-gain-500/20 text-gain-400 hover:bg-gain-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed justify-self-start"
                      title="Save set"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(ex.id)}
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
          onClick={() => handleEndSession()}
          disabled={isEnding || endSessionMutation.isLoading}
          className="flex items-center gap-2 px-6 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-mono text-sm"
        >
          <StopCircle className="w-5 h-5" />
          End session
        </button>
      </div>
    </div>
  );
}
