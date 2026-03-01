import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';

export function shareRouter(db) {
  const router = Router();

  router.get('/workout/:slug', optionalAuth, async (req, res) => {
    const workout = await db.prepare(
      'SELECT id, name, slug, created_at FROM workouts WHERE slug = ?'
    ).get(req.params.slug);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    const exercises = await db.prepare(
      'SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index'
    ).all(workout.id);
    const isOwner = req.userId
      ? ((await db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(workout.id))?.user_id === req.userId)
      : false;
    res.json({ ...workout, exercises, isOwner });
  });

  return router;
}
