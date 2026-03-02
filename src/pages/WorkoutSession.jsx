import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, StopCircle, Trash2 } from 'lucide-react';
import { api } from '../api/client';

export default function WorkoutSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState({}); // exerciseId -> [{ set_index, reps, weight_kg, saved? }]
  const [isEnding, setIsEnding] = useState(false);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const initializedSessionRef = React.useRef(null);

  const { data: workout, isLoading } = useQuery(
    ['workout', id],
    () => api.get(`/workouts/${id}`),
    { enabled: !!id && id !== 'new' }
  );

  const { data: lastSession } = useQuery(
    ['workout', id, 'last-session'],
    () => api.get(`/workouts/${id}/last-session`),
    { enabled: !!id && !!workout?.id }
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
        queryClient.invalidateQueries(['workout', id, 'last-session']);
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
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['session', sessionId]);
        const exId = variables.workout_exercise_id;
        const setIdx = variables.set_index;
        setLogs((prev) => ({
          ...prev,
          [exId]: (prev[exId] || []).map((s, i) =>
            i === setIdx ? { ...s, saved: true, logId: data?.id } : s
          ),
        }));
      },
    }
  );

  React.useEffect(() => {
    if (workout?.exercises) {
      setSessionExercises(workout.exercises);
    }
  }, [workout?.exercises]);

  const exercises = sessionExercises;

  const lastSetByExercise = React.useMemo(() => {
    const logs = lastSession?.logs || [];
    const byEx = {};
    logs.forEach((log) => {
      const exId = log.workout_exercise_id;
      if (!byEx[exId] || (log.logged_at > (byEx[exId].logged_at || 0))) byEx[exId] = log;
    });
    return byEx;
  }, [lastSession?.logs]);

  // Group last session's logs by exercise, sorted by set_index, for "Last session: Set 1: X×Y kg" display
  const lastSessionSetsByExercise = React.useMemo(() => {
    const list = lastSession?.logs || [];
    const byEx = {};
    list.forEach((log) => {
      const exId = log.workout_exercise_id;
      if (!byEx[exId]) byEx[exId] = [];
      byEx[exId].push(log);
    });
    Object.keys(byEx).forEach((exId) => {
      byEx[exId].sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0));
    });
    return byEx;
  }, [lastSession?.logs]);

  // Pre-fill set rows from last session so user sees same number of sets (e.g. 3) ready to log
  React.useEffect(() => {
    if (!sessionId || !exercises.length) return;
    if (initializedSessionRef.current === sessionId) return;
    initializedSessionRef.current = sessionId;
    const initial = {};
    exercises.forEach((ex) => {
      const exLogs = lastSession?.logs ? (lastSession.logs || []).filter((l) => l.workout_exercise_id === ex.id) : [];
      const count = Math.max(1, exLogs.length);
      initial[ex.id] = Array.from({ length: count }, (_, i) => ({
        set_index: i,
        reps: '',
        weight_kg: '',
        saved: false,
      }));
    });
    setLogs(initial);
  }, [sessionId, exercises, lastSession?.logs]);

  React.useEffect(() => {
    if (workout?.id && !sessionId && !startSessionMutation.isLoading) {
      startSessionMutation.mutate();
    }
  }, [workout?.id, sessionId, startSessionMutation.isLoading, startSessionMutation]);

  const addExerciseMutation = useMutation(
    (payload) => api.put(`/workouts/${id}`, payload),
    {
      onSuccess: (updated) => {
        setSessionExercises(updated.exercises || []);
        queryClient.invalidateQueries(['workout', id]);
        queryClient.invalidateQueries('workouts');
        setNewExerciseName('');
        setIsAddingExercise(false);
      },
    }
  );

  const handleConfirmAddExercise = useCallback(() => {
    const trimmed = newExerciseName.trim();
    if (!trimmed || !workout) return;
    const currentExercises = exercises || [];
    const newId =
      (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      name: workout.name,
      exercises: [
        ...currentExercises.map((ex) => ({ id: ex.id, name: ex.name })),
        { id: newId, name: trimmed },
      ],
    };
    addExerciseMutation.mutate(payload);
  }, [newExerciseName, workout, exercises, addExerciseMutation]);

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
      const hasData = (reps !== '' && reps != null) || (weight_kg !== '' && weight_kg != null);
      if (!hasData) return;
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

  const deleteLogMutation = useMutation(
    (logId) => api.delete(`/sessions/${sessionId}/logs/${logId}`),
    {
      onSuccess: () => queryClient.invalidateQueries(['session', sessionId]),
    }
  );

  const removeSet = useCallback(
    (exerciseId, setIndex, logId) => {
      if (logId) {
        deleteLogMutation.mutate(logId);
      }
      setLogs((prev) => {
        const list = [...(prev[exerciseId] || [])];
        list.splice(setIndex, 1);
        return { ...prev, [exerciseId]: list };
      });
    },
    [deleteLogMutation]
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

  const hasAnyLoggedData = React.useMemo(() => {
    return exercises.some((ex) =>
      (logs[ex.id] || []).some(
        (set) =>
          set.saved ||
          (set.reps !== '' && set.reps != null) ||
          (set.weight_kg !== '' && set.weight_kg != null)
      )
    );
  }, [exercises, logs]);

  const handleEndSession = useCallback(async () => {
    if (isEnding || endSessionMutation.isLoading || !hasAnyLoggedData) return;
    setIsEnding(true);
    try {
      await saveAllUnsavedSets();
      endSessionMutation.mutate();
    } finally {
      setIsEnding(false);
    }
  }, [saveAllUnsavedSets, endSessionMutation, isEnding, hasAnyLoggedData]);

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-slab-900 border border-slab-850 px-4 py-3">
        <div>
          <p className="text-sm text-zinc-300 font-mono">Need to add an exercise mid-session?</p>
          <p className="text-xs text-zinc-500">
            New exercises will be saved to this workout so they&apos;re ready next time.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {isAddingExercise && (
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              placeholder="New exercise name"
              className="flex-1 px-3 py-2 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-500 font-mono text-sm"
            />
          )}
          <div className="flex items-center gap-2 justify-end">
            {isAddingExercise && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingExercise(false);
                  setNewExerciseName('');
                }}
                className="px-3 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            )}
            {isAddingExercise ? (
              <button
                type="button"
                onClick={handleConfirmAddExercise}
                disabled={addExerciseMutation.isLoading || !newExerciseName.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gain-500 hover:bg-gain-600 text-slab-950 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Save exercise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingExercise(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slab-850 border border-slab-850 hover:border-gain-500/50 text-zinc-100 rounded-lg text-xs font-mono"
              >
                <Plus className="w-4 h-4" />
                Add exercise
              </button>
            )}
          </div>
        </div>
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
              <div className="mb-4">
                <h2 className="font-semibold text-zinc-100 font-mono">{ex.name}</h2>
                {lastSetByExercise[ex.id] && (
                  <p className="text-sm text-zinc-500 font-mono mt-0.5">
                    Last: {[lastSetByExercise[ex.id].reps != null && `${lastSetByExercise[ex.id].reps} reps`, lastSetByExercise[ex.id].weight_kg != null && `${lastSetByExercise[ex.id].weight_kg} kg`].filter(Boolean).join(' × ')}
                  </p>
                )}
                {lastSessionSetsByExercise[ex.id]?.length > 0 && (
                  <p className="text-xs text-zinc-500 font-mono mt-1">
                    Last session: {lastSessionSetsByExercise[ex.id].map((log, i) => {
                      const parts = [log.reps != null && `${log.reps}`, log.weight_kg != null && `${log.weight_kg} kg`].filter(Boolean);
                      return `Set ${i + 1}: ${parts.length ? parts.join('×') : '—'}`;
                    }).join(', ')}
                  </p>
                )}
              </div>
              <div className="space-y-0">
                {/* Header and rows share the same grid so columns line up */}
                <div className="grid grid-cols-[4.5rem_5rem_5.5rem_2.5rem] sm:grid-cols-[5rem_6rem_6rem_3rem] items-center gap-x-3 sm:gap-x-4 text-zinc-500 text-xs font-mono uppercase tracking-wider pb-2 border-b border-slab-850">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span className="sr-only">Remove</span>
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
                      onBlur={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
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
                      onBlur={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
                      className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 bg-slab-850 border border-slab-850 rounded text-zinc-100 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(ex.id, setIdx, set.logId)}
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-slab-850 justify-self-start"
                      title="Remove set"
                      aria-label="Remove set"
                    >
                      <Trash2 className="w-4 h-4" />
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

      <div className="pt-6 border-t border-slab-850 flex flex-col items-center sm:items-end gap-2 pb-8">
        {!hasAnyLoggedData && (
          <p className="text-zinc-500 text-sm font-mono">Log at least one set (reps or weight) to end the session.</p>
        )}
        <button
          onClick={() => handleEndSession()}
          disabled={isEnding || endSessionMutation.isLoading || !hasAnyLoggedData}
          className="flex items-center gap-2 px-6 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <StopCircle className="w-5 h-5" />
          End session
        </button>
      </div>
    </div>
  );
}
