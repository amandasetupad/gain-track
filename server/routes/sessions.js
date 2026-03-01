import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';

export const sessionsRouter = Router();

sessionsRouter.post('/', (req, res) => {
  const { workoutId } = req.body;
  if (!workoutId) return res.status(400).json({ error: 'workoutId required' });
  const workout = db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, req.userId);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  const id = nanoid();
  db.prepare(
    'INSERT INTO sessions (id, user_id, workout_id) VALUES (?, ?, ?)'
  ).run(id, req.userId, workoutId);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.status(201).json(session);
});

sessionsRouter.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.id, s.workout_id, s.started_at, s.ended_at, w.name as workout_name
    FROM sessions s
    JOIN workouts w ON w.id = s.workout_id
    WHERE s.user_id = ?
    ORDER BY s.started_at DESC
    LIMIT 100
  `).all(req.userId);
  res.json(sessions);
});

sessionsRouter.get('/:id', (req, res) => {
  const session = db.prepare(`
    SELECT s.*, w.name as workout_name
    FROM sessions s
    JOIN workouts w ON w.id = s.workout_id
    WHERE s.id = ? AND s.user_id = ?
  `).get(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const logs = db.prepare(`
    SELECT id, workout_exercise_id, exercise_name, set_index, reps, weight_kg, logged_at
    FROM exercise_logs WHERE session_id = ? ORDER BY logged_at
  `).all(req.params.id);
  res.json({ ...session, logs });
});

sessionsRouter.patch('/:id/end', (req, res) => {
  const r = db.prepare(
    'UPDATE sessions SET ended_at = strftime(\'%s\', \'now\') WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Session not found' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json(session);
});

sessionsRouter.post('/:id/logs', (req, res) => {
  const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { workout_exercise_id, exercise_name, set_index, reps, weight_kg } = req.body;
  if (workout_exercise_id == null || exercise_name == null || set_index == null) {
    return res.status(400).json({ error: 'workout_exercise_id, exercise_name, set_index required' });
  }
  const id = nanoid();
  db.prepare(`
    INSERT INTO exercise_logs (id, session_id, workout_exercise_id, exercise_name, set_index, reps, weight_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, workout_exercise_id, exercise_name, set_index ?? null, reps ?? null, weight_kg ?? null);
  const log = db.prepare('SELECT * FROM exercise_logs WHERE id = ?').get(id);
  res.status(201).json(log);
});

sessionsRouter.get('/history/exercise/:workoutExerciseId', (req, res) => {
  const { workoutExerciseId } = req.params;
  const logs = db.prepare(`
    SELECT el.reps, el.weight_kg, el.set_index, el.logged_at, s.started_at
    FROM exercise_logs el
    JOIN sessions s ON s.id = el.session_id
    WHERE el.workout_exercise_id = ? AND s.user_id = ?
    ORDER BY el.logged_at ASC
  `).all(workoutExerciseId, req.userId);
  res.json(logs);
});

sessionsRouter.get('/history/exercise-names', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT el.exercise_name
    FROM exercise_logs el
    JOIN sessions s ON s.id = el.session_id
    WHERE s.user_id = ?
    ORDER BY el.exercise_name
  `).all(req.userId);
  res.json(rows.map((r) => r.exercise_name));
});

sessionsRouter.get('/history/by-name', (req, res) => {
  const exerciseName = req.query.exerciseName;
  if (!exerciseName?.trim()) return res.status(400).json({ error: 'exerciseName query required' });
  const logs = db.prepare(`
    SELECT el.id, el.reps, el.weight_kg, el.set_index, el.logged_at, el.exercise_name, s.started_at, s.id as session_id
    FROM exercise_logs el
    JOIN sessions s ON s.id = el.session_id
    WHERE s.user_id = ? AND el.exercise_name = ?
    ORDER BY el.logged_at ASC
  `).all(req.userId, exerciseName.trim());
  res.json(logs);
});
