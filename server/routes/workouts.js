import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';

export const workoutsRouter = Router();

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + nanoid(6);
}

workoutsRouter.get('/', (req, res) => {
  const workouts = db.prepare(`
    SELECT w.id, w.name, w.slug, w.created_at, w.updated_at,
           (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count
    FROM workouts w
    WHERE w.user_id = ?
    ORDER BY w.updated_at DESC
  `).all(req.userId);
  res.json(workouts);
});

workoutsRouter.get('/:id', (req, res) => {
  const workout = db.prepare(
    'SELECT id, name, slug, created_at, updated_at FROM workouts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  const exercises = db.prepare(
    'SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index'
  ).all(workout.id);
  res.json({ ...workout, exercises });
});

workoutsRouter.post('/', (req, res) => {
  const { name, exercises = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Workout name required' });
  const id = nanoid();
  const slug = slugify(name);
  db.prepare(
    'INSERT INTO workouts (id, user_id, name, slug) VALUES (?, ?, ?, ?)'
  ).run(id, req.userId, name.trim(), slug);
  for (let i = 0; i < exercises.length; i++) {
    const exId = nanoid();
    db.prepare(
      'INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES (?, ?, ?, ?)'
    ).run(exId, id, exercises[i].name?.trim() || `Exercise ${i + 1}`, i);
  }
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  const exList = db.prepare('SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(id);
  res.status(201).json({ ...workout, exercises: exList });
});

workoutsRouter.put('/:id', (req, res) => {
  const workout = db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  const { name, exercises } = req.body;
  if (name?.trim()) {
    db.prepare('UPDATE workouts SET name = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(name.trim(), req.params.id);
  }
  if (Array.isArray(exercises)) {
    db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(req.params.id);
    exercises.forEach((ex, i) => {
      const exId = ex.id && /^[a-zA-Z0-9_-]+$/.test(ex.id) ? ex.id : nanoid();
      db.prepare(
        'INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES (?, ?, ?, ?)'
      ).run(exId, req.params.id, ex.name?.trim() || `Exercise ${i + 1}`, i);
    });
  }
  const updated = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  const exList = db.prepare('SELECT id, name, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(req.params.id);
  res.json({ ...updated, exercises: exList });
});

workoutsRouter.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Workout not found' });
  res.status(204).send();
});
