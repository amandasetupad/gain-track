import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'workouts.db');

async function createSqliteDb() {
  const SQL = await initSqlJs();
  let data = null;
  try {
    data = readFileSync(dbPath);
  } catch {
    // New database
  }
  const internalDb = new SQL.Database(data);

  function save() {
    const buffer = internalDb.export();
    writeFileSync(dbPath, Buffer.from(buffer));
  }

  const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
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
    started_at INTEGER DEFAULT (strftime('%s', 'now')),
    ended_at INTEGER,
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
    logged_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
  );
  CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
  CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(workout_exercise_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_slug ON workouts(slug);
`;
  for (const sql of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    if (sql) internalDb.run(sql);
  }
  // In case workouts table already existed without order_index, try to add it.
  try {
    internalDb.run('ALTER TABLE workouts ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0');
  } catch {
    // ignore if column already exists
  }
  save();

  return {
    exec(sql) {
      internalDb.run(sql);
      save();
    },
    prepare(sql) {
      return {
        async run(...params) {
          if (params.length > 0) {
            internalDb.run(sql, params);
          } else {
            internalDb.run(sql);
          }
          save();
          return { changes: internalDb.getRowsModified() };
        },
        async get(...params) {
          const stmt = internalDb.prepare(sql);
          try {
            if (params.length > 0) stmt.bind(params);
            if (stmt.step()) return stmt.getAsObject();
            return undefined;
          } finally {
            stmt.free();
          }
        },
        async all(...params) {
          const stmt = internalDb.prepare(sql);
          const rows = [];
          try {
            if (params.length > 0) stmt.bind(params);
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
          } finally {
            stmt.free();
          }
        },
      };
    },
  };
}

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const { createPgDb } = await import('./db-pg.js');
    return createPgDb();
  }
  return createSqliteDb();
}
