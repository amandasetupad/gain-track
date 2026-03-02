import { Router } from 'express';
import { nanoid } from 'nanoid';
import { optionalAuth, authMiddleware } from '../middleware/auth.js';

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

  // Clone a shared workout into the authenticated user's account.
  // This copies only the routine structure (name + exercises), not any sessions or logs.
  router.post('/workout/:slug/save', authMiddleware, async (req, res) => {
    const source = await db
      .prepare('SELECT id, name FROM workouts WHERE slug = ?')
      .get(req.params.slug);
    if (!source) return res.status(404).json({ error: 'Workout not found' });

    const exercises = await db
      .prepare('SELECT name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index')
      .all(source.id);

    // Generate a new workout for this user with a unique slug.
    const newId = nanoid();
    const baseSlug = source.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newSlug = `${baseSlug}-${nanoid(6)}`;

    const maxRow = await db
      .prepare('SELECT COALESCE(MAX(order_index), -1) as max FROM workouts WHERE user_id = ?')
      .get(req.userId);
    const nextIndex = ((maxRow && maxRow.max) ?? -1) + 1;

    await db
      .prepare('INSERT INTO workouts (id, user_id, name, slug, order_index) VALUES (?, ?, ?, ?, ?)')
      .run(newId, req.userId, source.name, newSlug, nextIndex);

    for (let i = 0; i < exercises.length; i++) {
      const exId = nanoid();
      const ex = exercises[i];
      await db
        .prepare('INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES (?, ?, ?, ?)')
        .run(exId, newId, ex.name || `Exercise ${i + 1}`, i);
    }

    const created = await db
      .prepare('SELECT id, name, slug, created_at, updated_at, order_index FROM workouts WHERE id = ?')
      .get(newId);
    const createdExercises = await db
      .prepare('SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index')
      .all(newId);

    res.status(201).json({ ...created, exercises: createdExercises });
  });

  return router;
}
