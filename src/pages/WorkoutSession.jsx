import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Plus, StopCircle, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import ExerciseMedia from '../components/ExerciseMedia';
import { collapseLogsBySet } from '../utils/collapseLogs';

function setHasLoggedData(set) {
  return (
    set?.saved ||
    (set?.reps !== '' && set?.reps != null) ||
    (set?.weight_kg !== '' && set?.weight_kg != null)
  );
}

/** "Hip thrust – 4 × 6-8" → 4 planned sets */
function plannedSetCountFromName(name) {
  const m = String(name || '').match(/(\d+)\s*[×xX]\s*\d/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : 0;
}

const EQUIPMENT_PRESETS = ['Machine', 'Standing machine', 'Barbell', 'Bar + plates', 'Dumbbells'];

function EquipmentPicker({ value, options = [], onChange }) {
  const chips = [...new Set([...EQUIPMENT_PRESETS, ...options])];
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-1.5">
        How are you doing this?
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {chips.map((chip) => {
          const selected = value === chip;
          return (
            <button
              type="button"
              key={chip}
              onClick={() => onChange(selected ? '' : chip)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                selected
                  ? 'bg-gain-500/15 border-gain-500/50 text-gain-400'
                  : 'bg-slab-850 border-slab-850 text-zinc-300 hover:border-gain-500/40'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type it (e.g. one dumbbell, smith machine)"
        className="w-full px-3 py-1.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-400 font-mono text-xs"
      />
    </div>
  );
}

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
  const [revealedCount, setRevealedCount] = useState(1);
  const [nextArmed, setNextArmed] = useState(false);
  const [equipment, setEquipment] = useState({}); // exerciseId -> string
  const initializedSessionRef = React.useRef(null);
  const prevRevealedRef = React.useRef(1);
  const nextArmTimerRef = React.useRef(null);
  const blockNextUntilRef = React.useRef(0);
  const equipmentRef = React.useRef(equipment);
  equipmentRef.current = equipment;

  const { data: workout, isLoading } = useQuery(
    ['workout', id],
    () => api.get(`/workouts/${id}`),
    { enabled: !!id && id !== 'new' }
  );

  const { data: lastSession, isFetched: lastSessionFetched } = useQuery(
    ['workout', id, 'last-session'],
    () => api.get(`/workouts/${id}/last-session`),
    { enabled: !!id && !!workout?.id }
  );

  const { data: equipmentHistory } = useQuery(
    ['workout', id, 'equipment-history'],
    () => api.get(`/workouts/${id}/equipment-history`),
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
        queryClient.invalidateQueries(['workout', id, 'equipment-history']);
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

  const lastSessionSetsByExercise = React.useMemo(() => {
    const byEx = {};
    collapseLogsBySet(lastSession?.logs).forEach((log) => {
      const exId = log.workout_exercise_id;
      if (!byEx[exId]) byEx[exId] = [];
      byEx[exId].push(log);
    });
    Object.keys(byEx).forEach((exId) => {
      byEx[exId].sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0));
    });
    return byEx;
  }, [lastSession?.logs]);

  }, [lastSessionSetsByExercise]);

  const lastSetsForVariant = useCallback((exerciseId, variant) => {
    const key = (variant || '').trim();
    const variants = equipmentHistory?.[exerciseId]?.variants || {};
    if (key) return variants[key] || [];
    return lastSessionSetsByExercise[exerciseId] || [];
  }, [equipmentHistory, lastSessionSetsByExercise]);

  React.useEffect(() => {
    if (!equipmentHistory || !exercises.length) return;
    setEquipment((prev) => {
      const next = { ...prev };
      let changed = false;
      exercises.forEach((ex) => {
        if (next[ex.id] === undefined) {
          next[ex.id] = equipmentHistory[ex.id]?.lastVariant || '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [equipmentHistory, exercises]);

  // Create one empty row per unique set from last session (not duplicate partial saves)
  React.useEffect(() => {
    if (!sessionId || !exercises.length || !lastSessionFetched) return;
    if (initializedSessionRef.current === sessionId) return;
    initializedSessionRef.current = sessionId;
    setRevealedCount(1);
    setNextArmed(false);
    prevRevealedRef.current = 1;
    const initial = {};
    exercises.forEach((ex) => {
      const exLogs = lastSessionSetsByExercise[ex.id] || [];
      const count = Math.max(1, exLogs.length, plannedSetCountFromName(ex.name));
      initial[ex.id] = Array.from({ length: count }, (_, i) => ({
        set_index: i,
        reps: '',
        weight_kg: '',
        saved: false,
      }));
    });
    setLogs(initial);
  }, [sessionId, exercises, lastSessionFetched, lastSessionSetsByExercise]);

  const postponeNextArm = useCallback(() => {
    blockNextUntilRef.current = Date.now() + 700;
    setNextArmed(false);
    if (nextArmTimerRef.current) clearTimeout(nextArmTimerRef.current);
    nextArmTimerRef.current = setTimeout(() => setNextArmed(true), 700);
  }, []);

  const goToNextExercise = useCallback(() => {
    if (Date.now() < blockNextUntilRef.current) return;
    setNextArmed(false);
    setRevealedCount((count) => Math.min(count + 1, exercises.length));
  }, [exercises.length]);

  React.useEffect(() => () => {
    if (nextArmTimerRef.current) clearTimeout(nextArmTimerRef.current);
  }, []);

  React.useEffect(() => {
    if (revealedCount > prevRevealedRef.current) {
      const el = document.getElementById(`exercise-card-${revealedCount - 1}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevRevealedRef.current = revealedCount;
  }, [revealedCount]);

  React.useEffect(() => {
    if (workout?.id && !sessionId && !startSessionMutation.isLoading) {
      startSessionMutation.mutate();
    }
  }, [workout?.id, sessionId, startSessionMutation.isLoading, startSessionMutation]);

  const addExerciseMutation = useMutation(
    (payload) => api.put(`/workouts/${id}`, payload),
    {
      onSuccess: (updated) => {
        const next = updated.exercises || [];
        setSessionExercises(next);
        setRevealedCount(Math.max(1, next.length));
        setLogs((prev) => {
          const copy = { ...prev };
          next.forEach((ex) => {
            if (!copy[ex.id]) {
              copy[ex.id] = [{ set_index: 0, reps: '', weight_kg: '', saved: false }];
            }
          });
          return copy;
        });
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
        ...currentExercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          media_url: ex.media_url || null,
        })),
        { id: newId, name: trimmed },
      ],
    };
    addExerciseMutation.mutate(payload);
  }, [newExerciseName, workout, exercises, addExerciseMutation]);

  const updateSet = useCallback((exerciseId, setIndex, field, value) => {
    postponeNextArm();
    setLogs((prev) => {
      const list = [...(prev[exerciseId] || [])];
      if (!list[setIndex]) list[setIndex] = { set_index: setIndex, reps: '', weight_kg: '', saved: false };
      list[setIndex] = { ...list[setIndex], [field]: value };
      return { ...prev, [exerciseId]: list };
    });
  }, [postponeNextArm]);

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
        variant: (equipmentRef.current[exerciseId] || '').trim() || null,
      });
    },
    [sessionId, logMutation]
  );

  const handleEquipmentChange = useCallback((exerciseId, exerciseName, value) => {
    equipmentRef.current = { ...equipmentRef.current, [exerciseId]: value };
    setEquipment((prev) => ({ ...prev, [exerciseId]: value }));
    const list = logs[exerciseId] || [];
    list.forEach((set, setIdx) => {
      if (setHasLoggedData(set)) {
        saveSet(exerciseId, exerciseName, setIdx, set.reps, set.weight_kg);
      }
    });
  }, [logs, saveSet]);

  const addSet = useCallback(
    (exerciseId, exerciseName) => {
      const list = logs[exerciseId] || [];
      const previous = list[list.length - 1];
      const setIndex = list.length;
      const next = {
        set_index: setIndex,
        reps: previous?.reps ?? '',
        weight_kg: previous?.weight_kg ?? '',
        saved: false,
      };
      setLogs((prev) => ({
        ...prev,
        [exerciseId]: [...list, next],
      }));
      if (setHasLoggedData(next)) {
        saveSet(exerciseId, exerciseName, setIndex, next.reps, next.weight_kg);
      }
    },
    [logs, saveSet]
  );

  const fillSetFromPrevious = useCallback((exerciseId, exerciseName, setIndex) => {
    if (setIndex <= 0) return;
    const list = logs[exerciseId] || [];
    const current = list[setIndex];
    const previous = list[setIndex - 1];
    if (!current || !previous) return;
    if (setHasLoggedData(current) || !setHasLoggedData(previous)) return;
    setLogs((prev) => {
      const rows = [...(prev[exerciseId] || [])];
      if (!rows[setIndex]) return prev;
      rows[setIndex] = {
        ...rows[setIndex],
        reps: previous.reps ?? '',
        weight_kg: previous.weight_kg ?? '',
      };
      return { ...prev, [exerciseId]: rows };
    });
    saveSet(exerciseId, exerciseName, setIndex, previous.reps, previous.weight_kg);
  }, [logs, saveSet]);

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
            variant: (equipment[ex.id] || '').trim() || null,
          }).catch(() => {});
        }
      }
    }
  }, [sessionId, exercises, logs, equipment]);

  const hasAnyLoggedData = React.useMemo(() => {
    return exercises.some((ex) => (logs[ex.id] || []).some(setHasLoggedData));
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
          aria-label="Back to workout"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">Back</span>
        </Link>
        <h1 className="text-xl font-bold text-zinc-100 font-mono truncate">
          {workout.name} — Session
        </h1>
        <span className="w-24 text-right text-xs text-zinc-400 font-mono" aria-hidden={exercises.length === 0}>
          {exercises.length > 0 ? `${Math.min(revealedCount, exercises.length)} / ${exercises.length}` : ''}
        </span>
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
          {exercises.slice(0, Math.max(1, Math.min(revealedCount, exercises.length || 1))).map((ex, idx) => {
            const isCurrent = idx === revealedCount - 1;
            const isPast = idx < revealedCount - 1;
            const hasLogged = (logs[ex.id] || []).some(setHasLoggedData);
            const canGoNext = isCurrent && idx < exercises.length - 1;
            const variant = equipment[ex.id] || '';
            const variantSets = lastSetsForVariant(ex.id, variant);
            const lastVariantSet = variantSets[variantSets.length - 1];
            return (
            <motion.section
              key={ex.id}
              id={`exercise-card-${idx}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-2xl p-5 sm:p-6 ${
                isCurrent
                  ? 'bg-slab-900 border border-gain-500/40 shadow-[0_0_24px_-8px_rgba(34,197,94,0.35)]'
                  : 'bg-slab-900/80 border border-slab-850'
              }`}
            >
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-1">
                      Exercise {idx + 1}
                    </p>
                    <h2 className="font-semibold text-zinc-100 font-mono">{ex.name}</h2>
                    {lastVariantSet && (
                      <p className="text-sm text-zinc-400 font-mono mt-0.5">
                        Last{variant ? ` (${variant})` : ''}: {[lastVariantSet.reps != null && `${lastVariantSet.reps} reps`, lastVariantSet.weight_kg != null && `${lastVariantSet.weight_kg} kg`].filter(Boolean).join(' × ')}
                      </p>
                    )}
                    {variantSets.length > 0 && (
                      <p className="text-xs text-zinc-400 font-mono mt-1">
                        Last {variant || 'session'}: {variantSets.map((log, i) => {
                          const parts = [log.reps != null && `${log.reps}`, log.weight_kg != null && `${log.weight_kg} kg`].filter(Boolean);
                          return `Set ${i + 1}: ${parts.length ? parts.join('×') : '—'}`;
                        }).join(', ')}
                      </p>
                    )}
                  </div>
                  {isPast && (
                    <span className="inline-flex items-center gap-1 text-gain-500 text-xs font-mono flex-shrink-0 mt-1">
                      <Check className="w-4 h-4" />
                      Done
                    </span>
                  )}
                </div>
                <ExerciseMedia url={ex.media_url} size="md" alt={ex.name} />
                <EquipmentPicker
                  value={variant}
                  options={equipmentHistory?.[ex.id]?.options || []}
                  onChange={(value) => handleEquipmentChange(ex.id, ex.name, value)}
                />
              </div>
              <div className="space-y-0">
                {/* Header and rows share the same grid so columns line up */}
                <div className="grid grid-cols-[4.5rem_5rem_5.5rem_2.5rem] sm:grid-cols-[5rem_6rem_6rem_3rem] items-center gap-x-3 sm:gap-x-4 text-zinc-400 text-xs font-mono uppercase tracking-wider pb-2 border-b border-slab-850">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span className="sr-only">Remove</span>
                </div>
                {(logs[ex.id] || []).map((set, setIdx) => {
                  const prevSet = variantSets[setIdx];
                  return (
                  <div
                    key={setIdx}
                    className="grid grid-cols-[4.5rem_5rem_5.5rem_2.5rem] sm:grid-cols-[5rem_6rem_6rem_3rem] items-center gap-x-3 sm:gap-x-4 py-2.5 border-b border-slab-850 last:border-0"
                  >
                    <span className="text-zinc-400 text-sm font-mono">Set {setIdx + 1}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={prevSet?.reps != null ? String(prevSet.reps) : ''}
                      aria-label="Reps"
                      value={set.reps ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'reps', e.target.value)}
                      onFocus={() => fillSetFromPrevious(ex.id, ex.name, setIdx)}
                      onBlur={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 bg-slab-850 border border-slab-850 rounded text-zinc-100 placeholder-zinc-400 font-mono text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={prevSet?.weight_kg != null ? String(prevSet.weight_kg) : ''}
                      aria-label="Weight (kg)"
                      value={set.weight_kg ?? ''}
                      onChange={(e) => updateSet(ex.id, setIdx, 'weight_kg', e.target.value)}
                      onFocus={() => fillSetFromPrevious(ex.id, ex.name, setIdx)}
                      onBlur={() => saveSet(ex.id, ex.name, setIdx, set.reps, set.weight_kg)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 bg-slab-850 border border-slab-850 rounded text-zinc-100 placeholder-zinc-400 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(ex.id, setIdx, set.logId)}
                      className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-slab-850 justify-self-start"
                      title="Remove set"
                      aria-label="Remove set"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addSet(ex.id, ex.name)}
                  className="flex items-center gap-2 text-sm text-gain-500 hover:text-gain-400 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add set
                </button>
              </div>
              {canGoNext && nextArmed && hasLogged && (
                <button
                  type="button"
                  onClick={goToNextExercise}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-xl"
                >
                  Next exercise
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.section>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-slab-900 border border-slab-850 px-4 py-3">
        <div>
          <p className="text-sm text-zinc-300 font-mono">Need to add an exercise mid-session?</p>
          <p className="text-xs text-zinc-400">
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
              className="flex-1 px-3 py-2 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-400 font-mono text-sm"
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

      <div className="pt-6 border-t border-slab-850 flex flex-col items-center sm:items-end gap-2 pb-8">
        {!hasAnyLoggedData && (
          <p className="text-zinc-400 text-sm font-mono">Log at least one set (reps or weight) to end the session.</p>
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
