import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Check,
  Trash2,
  Plus,
  GripVertical,
  ArrowLeft,
  Share2,
  TrendingUp,
  Pencil,
} from 'lucide-react';
import { api } from '../api/client';

const isNew = (id) => id === 'new';

function formatSessionDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function lastSetPerExercise(logs) {
  if (!logs?.length) return {};
  const byEx = {};
  logs.forEach((log) => {
    const exId = log.workout_exercise_id;
    if (!byEx[exId] || (log.logged_at > (byEx[exId].logged_at || 0))) {
      byEx[exId] = log;
    }
  });
  return byEx;
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [copied, setCopied] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState(null); // 'success' | 'error' | null (amber/info)
  const [lastSavedName, setLastSavedName] = useState('');
  const [lastSavedExercises, setLastSavedExercises] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setBannerMessage(location.state.message);
      setBannerType(location.state.type ?? null);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.message, location.state?.type, location.pathname, navigate]);

  const { data: workout, isLoading } = useQuery(
    ['workout', id],
    () => api.get(`/workouts/${id}`),
    { enabled: !isNew(id) }
  );

  const { data: lastSession } = useQuery(
    ['workout', id, 'last-session'],
    () => api.get(`/workouts/${id}/last-session`),
    { enabled: !isNew(id) && !!workout?.id }
  );

  React.useEffect(() => {
    if (workout) {
      setName(workout.name || '');
      const initialExercises = workout.exercises?.length ? workout.exercises : [{ id: '', name: '' }];
      setExercises(initialExercises);
      // Capture a \"saved\" snapshot used to detect unsaved changes.
      setLastSavedName(workout.name || '');
      setLastSavedExercises(
        (initialExercises || []).map((ex) => ({ id: ex.id || '', name: ex.name || '' }))
      );
    }
    if (isNew(id)) {
      setName('');
      setExercises([{ id: '', name: '' }]);
      setLastSavedName('');
      setLastSavedExercises([]);
    }
  }, [workout, id]);

  const isDirty = React.useMemo(() => {
    // New workout: consider dirty only if the user typed a name or any exercise name.
    if (isNew(id) && !workout) {
      if (name.trim()) return true;
      return exercises.some((ex) => ex.name?.trim());
    }
    const current = (exercises || []).map((ex) => ({ id: ex.id || '', name: ex.name || '' }));
    const saved = lastSavedExercises || [];
    if (name !== lastSavedName) return true;
    if (current.length !== saved.length) return true;
    for (let i = 0; i < current.length; i++) {
      if (current[i].id !== saved[i].id || current[i].name !== saved[i].name) {
        return true;
      }
    }
    return false;
  }, [id, workout, name, exercises, lastSavedName, lastSavedExercises]);

  const createMutation = useMutation(
    (payload) => api.post('/workouts', payload),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('workouts');
        navigate(`/workout/${data.id}`, { replace: true });
      },
      onError: (err) => {
        setBannerMessage(err?.error || err?.message || 'Failed to create routine.');
        setBannerType('error');
      },
    }
  );

  const updateMutation = useMutation(
    (payload) => api.put(`/workouts/${id}`, payload),
    {
      onSuccess: () => {
        queryClient
          .invalidateQueries(['workout', id])
          .then(() => queryClient.invalidateQueries('workouts'));
        setBannerMessage('Workout updated.');
        setBannerType('success');
        setIsEditing(false);
      },
      onError: (err) => {
        setBannerMessage(err?.error || err?.message || 'Failed to save routine.');
        setBannerType('error');
      },
    }
  );

  const deleteMutation = useMutation(
    () => api.delete(`/workouts/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workouts');
        navigate('/');
      },
      onError: (err) => {
        setBannerMessage(err?.error || err?.message || 'Failed to delete routine.');
        setBannerType('error');
      },
    }
  );

  const addExercise = () => setExercises((e) => [...e, { id: '', name: '' }]);
  const removeExercise = (index) =>
    setExercises((e) => e.filter((_, i) => i !== index));
  const updateExercise = (index, field, value) =>
    setExercises((e) =>
      e.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );

  const save = () => {
    const payload = {
      name: name.trim(),
      exercises: exercises.filter((ex) => ex.name?.trim()).map((ex, i) => ({ ...ex, name: ex.name?.trim(), order_index: i })),
    };
    if (isNew(id)) createMutation.mutate(payload);
    else updateMutation.mutate(payload);
  };

  const startSession = () => {
    if (isNew(id) || !workout?.id) return;
    navigate(`/workout/${workout.id}/session`);
  };

  const shareUrl = workout?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${workout.slug}`
    : '';
  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackClick = (event) => {
    event.preventDefault();
    if (isDirty) {
      const leave = window.confirm(
        'You have unsaved changes to this workout. Leave without saving?'
      );
      if (!leave) return;
    }
    navigate('/');
  };

  const cancelEdit = () => {
    if (workout) {
      setName(workout.name || '');
      const initial = workout.exercises?.length ? workout.exercises : [{ id: '', name: '' }];
      setExercises(initial.map((ex) => ({ id: ex.id || '', name: ex.name || '' })));
    }
    setIsEditing(false);
  };

  if (!isNew(id) && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gain-500 font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bannerMessage && (
        <div
          className={`rounded-lg px-4 py-2 text-sm font-mono ${
            bannerType === 'success'
              ? 'bg-gain-500/10 border border-gain-500/30 text-gain-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}
        >
          {bannerMessage}
        </div>
      )}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          onClick={handleBackClick}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-slab-850"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-100 font-mono truncate">
            {isNew(id) ? 'New workout' : (workout?.name || name) || 'Workout'}
          </h1>
          <p className="text-sm text-zinc-500">
            {!isNew(id) && !isEditing
              ? 'Start a session or share this workout'
              : 'Build your workout exercise list'}
          </p>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 mt-1 text-sm text-gain-500 hover:text-gain-400"
          >
            <TrendingUp className="w-4 h-4" />
            View your logged reps & weight in Progress
          </Link>
        </div>
      </div>

      {!isNew(id) && lastSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-slab-850 bg-slab-900/80 px-4 py-3"
        >
          <p className="text-sm text-zinc-400 font-mono">
            Last session ended <span className="text-zinc-200">{formatSessionDate(lastSession.ended_at)}</span>
            {lastSession.logs?.length > 0 && (
              <span className="text-zinc-500"> · {lastSession.logs.length} set{lastSession.logs.length !== 1 ? 's' : ''} logged</span>
            )}
          </p>
        </motion.div>
      )}

      {/* View mode: existing workout, not editing — show only Start session, Share link, Edit */}
      {!isNew(id) && !isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-5 sm:p-6 space-y-5"
        >
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Workout</p>
            <p className="text-lg font-mono text-zinc-100">{workout?.name || name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-2">Exercises</p>
            <ul className="space-y-2">
              {(workout?.exercises || exercises).filter((ex) => ex.name?.trim()).map((ex, index) => {
                const lastByEx = lastSetPerExercise(lastSession?.logs);
                const last = ex.id ? lastByEx[ex.id] : null;
                const lastStr = last != null
                  ? [last.reps != null && `${last.reps} reps`, last.weight_kg != null && `${last.weight_kg} kg`].filter(Boolean).join(' × ')
                  : null;
                return (
                  <li
                    key={ex.id || index}
                    className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2 px-3 rounded-lg bg-slab-850/50 border border-slab-850"
                  >
                    <span className="font-mono text-zinc-200">{ex.name || `Exercise ${index + 1}`}</span>
                    {lastStr && (
                      <span className="text-xs font-mono text-zinc-500">Last: {lastStr}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={startSession}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start session
            </button>
            {shareUrl && (
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slab-850 border border-slab-850 hover:border-gain-500/50 text-zinc-100 font-medium rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-gain-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Share link'}
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slab-850 border border-slab-850 hover:border-gain-500/50 text-zinc-100 font-medium rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        </motion.div>
      )}

      {/* Edit mode: new workout or Edit clicked — show Save, Delete, + Add, trash bins */}
      {(isNew(id) || isEditing) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slab-900 border border-slab-850 rounded-xl p-5 sm:p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Workout name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leg Day, Push Day"
              className="w-full px-4 py-2.5 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-gain-500 focus:ring-1 focus:ring-gain-500 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-400">Exercises</label>
              <button
                type="button"
                onClick={addExercise}
                className="flex items-center gap-1.5 text-sm text-gain-500 hover:text-gain-400"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {(() => {
                const lastByEx = lastSetPerExercise(lastSession?.logs);
                return (
                  <AnimatePresence>
                    {exercises.map((ex, index) => {
                      const last = ex.id ? lastByEx[ex.id] : null;
                      const lastStr = last != null
                        ? [last.reps != null && `${last.reps} reps`, last.weight_kg != null && `${last.weight_kg} kg`].filter(Boolean).join(' × ')
                        : null;
                      return (
                        <motion.div
                          key={index}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) => updateExercise(index, 'name', e.target.value)}
                              placeholder={`Exercise ${index + 1}`}
                              className="flex-1 px-4 py-2 bg-slab-850 border border-slab-850 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-gain-500 font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeExercise(index)}
                              className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-slab-850"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {lastStr && (
                            <span className="text-xs font-mono text-zinc-500 sm:min-w-[8rem] pl-6 sm:pl-0">
                              Last: {lastStr}
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={save}
              disabled={
                !name.trim() ||
                createMutation.isLoading ||
                updateMutation.isLoading
              }
              className="px-4 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {isNew(id) ? 'Create' : 'Save'}
            </button>
            {!isNew(id) && isEditing && (
              <>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2.5 bg-slab-850 border border-slab-850 hover:border-gain-500/50 text-zinc-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
