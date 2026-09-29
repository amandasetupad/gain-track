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
    media_url TEXT,
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
    variant TEXT,
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
  ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS media_url TEXT;
  ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS variant TEXT;
`;

function sanitizeDatabaseUrl(raw) {
  return String(raw || '').trim().replace(/^['"]+|['"]+$/g, '');
}

function hostnameOf(connectionString) {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return '';
  }
}

function withHostname(connectionString, hostname) {
  const u = new URL(connectionString);
  u.hostname = hostname;
  return u.toString();
}

function isRenderInternalHost(hostname) {
  return /^dpg-[a-z0-9]+-a$/i.test(hostname || '');
}

function pgPoolConfig(connectionString) {
  const config = {
    connectionString,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  };
  // Render and most cloud Postgres require SSL in production.
  const needsSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString?.includes('render.com') ||
    connectionString?.includes('sslmode=require');
  if (needsSsl) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryPool(connectionString) {
  const pool = new Pool(pgPoolConfig(connectionString));
  try {
    await pool.query('SELECT 1');
    return pool;
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
}

function candidateUrls(rawUrl) {
  const url = sanitizeDatabaseUrl(rawUrl);
  const urls = [url];
  const host = hostnameOf(url);
  if (isRenderInternalHost(host)) {
    const region = (process.env.RENDER_REGION || 'oregon').toLowerCase();
    const external = `${host}.${region}-postgres.render.com`;
    urls.push(withHostname(url, external));
  }
  return [...new Set(urls)];
}

async function connectWithRetry(rawUrl) {
  const urls = candidateUrls(rawUrl);
  let lastErr;
  for (const connectionString of urls) {
    const host = hostnameOf(connectionString) || '(unknown host)';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1 || urls.indexOf(connectionString) > 0) {
          console.log(`Connecting to PostgreSQL at ${host} (attempt ${attempt})`);
        }
        return await tryPool(connectionString);
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || '');
        const retryable =
          err.code === 'ENOTFOUND' ||
          err.code === 'ECONNREFUSED' ||
          err.code === 'ETIMEDOUT' ||
          /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/.test(msg);
        if (!retryable || attempt === 3) break;
        await sleep(1500 * attempt);
      }
    }
  }
  const host = hostnameOf(sanitizeDatabaseUrl(rawUrl)) || '(unparseable DATABASE_URL)';
  const wrapped = new Error(
    `Could not reach PostgreSQL host "${host}". ` +
      'On Render: open the PostgreSQL database → confirm it is Available → copy Internal Database URL ' +
      '(or External Database URL if Internal does not resolve) → paste into the web service Environment as DATABASE_URL → Redeploy. ' +
      `Original error: ${lastErr?.message || lastErr}`
  );
  wrapped.cause = lastErr;
  throw wrapped;
}

export async function createPgDb() {
  const pool = await connectWithRetry(process.env.DATABASE_URL);
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      // Idempotent migrations (e.g. column/index already exists).
      if (err.code === '42701' || err.code === '42P07') continue;
      throw err;
    }
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
