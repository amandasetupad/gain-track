import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Copy,
  Check,
  Trash2,
  Plus,
  GripVertical,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { api } from '../api/client';

const isNew = (id) => id === 'new';

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [copied, setCopied] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);

  useEffect(() => {
    if (location.state?.message) {
      setBannerMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.message, location.pathname, navigate]);

  const { data: workout, isLoading } = useQuery(
    ['workout', id],
    () => api.get(`/workouts/${id}`),
    { enabled: !isNew(id) }
  );

  React.useEffect(() => {
    if (workout) {
      setName(workout.name || '');
      setExercises(workout.exercises?.length ? workout.exercises : [{ id: '', name: '' }]);
    }
    if (isNew(id)) {
      setName('');
      setExercises([{ id: '', name: '' }]);
    }
  }, [workout, id]);

  const createMutation = useMutation(
    (payload) => api.post('/workouts', payload),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('workouts');
        navigate(`/workout/${data.id}`, { replace: true });
      },
    }
  );

  const updateMutation = useMutation(
    (payload) => api.put(`/workouts/${id}`, payload),
    { onSuccess: () => queryClient.invalidateQueries(['workout', id]).then(() => queryClient.invalidateQueries('workouts')) }
  );

  const deleteMutation = useMutation(
    () => api.delete(`/workouts/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('workouts'); navigate('/'); } }
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
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 text-sm font-mono">
          {bannerMessage}
        </div>
      )}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-slab-850"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-100 font-mono truncate">
            {isNew(id) ? 'New routine' : (workout?.name || name) || 'Edit routine'}
          </h1>
          <p className="text-sm text-zinc-500">Build your exercise list</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slab-900 border border-slab-850 rounded-xl p-5 sm:p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Routine name</label>
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
            <AnimatePresence>
              {exercises.map((ex, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2"
                >
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
                </motion.div>
              ))}
            </AnimatePresence>
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
          {!isNew(id) && (
            <>
              <button
                onClick={startSession}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slab-850 border border-slab-850 hover:border-gain-500/50 text-zinc-100 font-medium rounded-lg transition-colors"
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
                  {copied ? 'Copied!' : 'Copy share link'}
                </button>
              )}
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
    </div>
  );
}
