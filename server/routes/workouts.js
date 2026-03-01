import { Router } from 'express';
import { nanoid } from 'nanoid';

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + nanoid(6);
}

export function workoutsRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const workouts = await db.prepare(`
      SELECT w.id, w.name, w.slug, w.created_at, w.updated_at,
             (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count
      FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.updated_at DESC
    `).all(req.userId);
    res.json(workouts);
  });

  router.get('/:id/last-session', async (req, res) => {
    const workout = await db.prepare(
      'SELECT id FROM workouts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    const session = await db.prepare(`
      SELECT s.id, s.workout_id, s.started_at, s.ended_at, w.name as workout_name
      FROM sessions s
      JOIN workouts w ON w.id = s.workout_id
      WHERE s.workout_id = ? AND s.user_id = ? AND s.ended_at IS NOT NULL
      ORDER BY s.ended_at DESC
      LIMIT 1
    `).get(req.params.id, req.userId);
    if (!session) return res.json(null);
    const logs = await db.prepare(`
      SELECT id, workout_exercise_id, exercise_name, set_index, reps, weight_kg, logged_at
      FROM exercise_logs WHERE session_id = ? ORDER BY logged_at
    `).all(session.id);
    res.json({ ...session, logs });
  });

  router.get('/:id', async (req, res) => {
    const workout = await db.prepare(
      'SELECT id, name, slug, created_at, updated_at FROM workouts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    const exercises = await db.prepare(
      'SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index'
    ).all(workout.id);
    res.json({ ...workout, exercises });
  });

  router.post('/', async (req, res) => {
    const { name, exercises = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Workout name required' });
    const id = nanoid();
    const slug = slugify(name);
    await db.prepare(
      'INSERT INTO workouts (id, user_id, name, slug) VALUES (?, ?, ?, ?)'
    ).run(id, req.userId, name.trim(), slug);
    for (let i = 0; i < exercises.length; i++) {
      const exId = nanoid();
      await db.prepare(
        'INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES (?, ?, ?, ?)'
      ).run(exId, id, exercises[i].name?.trim() || `Exercise ${i + 1}`, i);
    }
    const workout = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
    const exList = await db.prepare('SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(id);
    res.status(201).json({ ...workout, exercises: exList });
  });

  router.put('/:id', async (req, res) => {
    const workout = await db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    const { name, exercises } = req.body;
    if (name?.trim()) {
      await db.prepare('UPDATE workouts SET name = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(name.trim(), req.params.id);
    }
    if (Array.isArray(exercises)) {
      await db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(req.params.id);
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const exId = ex.id && /^[a-zA-Z0-9_-]+$/.test(ex.id) ? ex.id : nanoid();
        await db.prepare(
          'INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES (?, ?, ?, ?)'
        ).run(exId, req.params.id, ex.name?.trim() || `Exercise ${i + 1}`, i);
      }
    }
    const updated = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    const exList = await db.prepare('SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(req.params.id);
    res.json({ ...updated, exercises: exList });
  });

  router.delete('/:id', async (req, res) => {
    const r = await db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (r.changes === 0) return res.status(404).json({ error: 'Workout not found' });
    res.status(204).send();
  });

  return router;
}
