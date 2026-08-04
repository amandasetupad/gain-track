/**
 * Inspect database contents (SQLite or PostgreSQL via DATABASE_URL).
 * Usage: node server/scripts/inspect-db.js
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/workouts.db');

async function inspectSqlite() {
  if (!existsSync(dbPath)) {
    console.log('No local SQLite file at server/data/workouts.db');
    return;
  }
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(dbPath));
  function q(sql) {
    const stmt = db.prepare(sql);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  console.log('\n=== SQLite:', dbPath, '===');
  await printSummary(q);
}

async function inspectPostgres() {
  if (!process.env.DATABASE_URL) {
    console.log('\nDATABASE_URL not set — skipping PostgreSQL inspection.');
    return;
  }
  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production' ||
      process.env.DATABASE_URL.includes('render.com')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 15000,
  });
  try {
    async function q(sql) {
      const r = await pool.query(sql);
      return r.rows;
    }
    console.log('\n=== PostgreSQL (DATABASE_URL) ===');
    await printSummary(q);
  } finally {
    await pool.end();
  }
}

async function printSummary(q) {
  const users = await q('SELECT id, email, created_at FROM users ORDER BY created_at');
  const workouts = await q('SELECT id, user_id, name, slug FROM workouts ORDER BY name');
  const exercises = await q(
    'SELECT workout_id, name, order_index FROM workout_exercises ORDER BY workout_id, order_index'
  );
  const sessions = await q('SELECT COUNT(*) AS c FROM sessions');
  const logs = await q('SELECT COUNT(*) AS c FROM exercise_logs');

  console.log('Users:', users.length);
  users.forEach((u) => console.log('  -', u.email, `(${u.id})`));
  console.log('Workouts:', workouts.length);
  workouts.forEach((w) => console.log('  -', w.name, `[${w.slug}]`, `user=${w.user_id}`));
  console.log('Exercises:', exercises.length);
  console.log('Sessions:', Number(sessions[0]?.c ?? 0));
  console.log('Exercise logs:', Number(logs[0]?.c ?? 0));
}

console.log('GainTrack database inspector');
await inspectSqlite();
await inspectPostgres();
