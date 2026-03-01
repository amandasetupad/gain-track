import { Router } from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

export const shareRouter = Router();

shareRouter.get('/workout/:slug', optionalAuth, (req, res) => {
  const workout = db.prepare(
    'SELECT id, name, slug, created_at FROM workouts WHERE slug = ?'
  ).get(req.params.slug);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  const exercises = db.prepare(
    'SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index'
  ).all(workout.id);
  const isOwner = req.userId
    ? (db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(workout.id)?.user_id === req.userId)
    : false;
  res.json({ ...workout, exercises, isOwner });
});
