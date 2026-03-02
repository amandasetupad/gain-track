import pg from 'pg';

const { Pool } = pg;

function toPgParams(sql) {
  let s = sql.replace(/strftime\s*\(\s*'%s'\s*,\s*'now'\s*\)/gi, '(EXTRACT(EPOCH FROM NOW())::BIGINT)');
  let i = 0;
  return s.replace(/\?/g, () => `$${++i}`);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
  );
  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workout_id TEXT NOT NULL,
    started_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
    ended_at BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workout_id) REFERENCES workouts(id)
  );
  CREATE TABLE IF NOT EXISTS exercise_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    workout_exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    reps INTEGER,
    weight_kg REAL,
    logged_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
  );
  CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
  CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(workout_exercise_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_slug ON workouts(slug);
  ALTER TABLE workouts ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
`;

export async function createPgDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
  for (const sql of statements) {
    await pool.query(sql);
  }
  return {
    async exec(sql) {
      const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const s of statements) await pool.query(s);
    },
    prepare(sql) {
      const pgSql = toPgParams(sql);
      return {
        async run(...params) {
          const r = await pool.query(pgSql, params);
          return { changes: r.rowCount ?? 0 };
        },
        async get(...params) {
          const r = await pool.query(pgSql, params);
          return r.rows[0];
        },
        async all(...params) {
          const r = await pool.query(pgSql, params);
          return r.rows;
        },
      };
    },
  };
}
