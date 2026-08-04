/**
 * Copy all data from local SQLite (server/data/workouts.db) into PostgreSQL (DATABASE_URL).
 * Use after fixing DATABASE_URL on Render to restore a local backup, or to merge local data into Postgres.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node server/scripts/migrate-sqlite-to-pg.js
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/workouts.db');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL to your Render PostgreSQL Internal Database URL.');
  process.exit(1);
}
if (!existsSync(dbPath)) {
  console.error('No local SQLite file at server/data/workouts.db');
  process.exit(1);
}

const SQL = await initSqlJs();
const sqlite = new SQL.Database(readFileSync(dbPath));

function sqliteAll(sql) {
  const stmt = sqlite.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL.includes('render.com')
      ? { rejectUnauthorized: false }
      : undefined,
});

const { createPgDb } = await import('../db-pg.js');
await createPgDb();
console.log('PostgreSQL schema ensured.');

const tables = [
  {
    name: 'users',
    sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
    rows: sqliteAll('SELECT id, email, password_hash, created_at FROM users'),
    params: (r) => [r.id, r.email, r.password_hash, r.created_at],
  },
  {
    name: 'workouts',
    sql: 'INSERT INTO workouts (id, user_id, name, slug, created_at, updated_at, order_index) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
    rows: sqliteAll('SELECT id, user_id, name, slug, created_at, updated_at, order_index FROM workouts'),
    params: (r) => [r.id, r.user_id, r.name, r.slug, r.created_at, r.updated_at, r.order_index ?? 0],
  },
  {
    name: 'workout_exercises',
    sql: 'INSERT INTO workout_exercises (id, workout_id, name, order_index) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
    rows: sqliteAll('SELECT id, workout_id, name, order_index FROM workout_exercises'),
    params: (r) => [r.id, r.workout_id, r.name, r.order_index ?? 0],
  },
  {
    name: 'sessions',
    sql: 'INSERT INTO sessions (id, user_id, workout_id, started_at, ended_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
    rows: sqliteAll('SELECT id, user_id, workout_id, started_at, ended_at FROM sessions'),
    params: (r) => [r.id, r.user_id, r.workout_id, r.started_at, r.ended_at],
  },
  {
    name: 'exercise_logs',
    sql: 'INSERT INTO exercise_logs (id, session_id, workout_exercise_id, exercise_name, set_index, reps, weight_kg, logged_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING',
    rows: sqliteAll('SELECT id, session_id, workout_exercise_id, exercise_name, set_index, reps, weight_kg, logged_at FROM exercise_logs'),
    params: (r) => [r.id, r.session_id, r.workout_exercise_id, r.exercise_name, r.set_index, r.reps, r.weight_kg, r.logged_at],
  },
];

for (const t of tables) {
  let inserted = 0;
  for (const row of t.rows) {
    const r = await pool.query(t.sql, t.params(row));
    if (r.rowCount > 0) inserted++;
  }
  console.log(`${t.name}: ${inserted}/${t.rows.length} rows inserted (skipped existing)`);
}

await pool.end();
console.log('Migration complete.');
