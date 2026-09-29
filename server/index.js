import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDb, dbDriver } from './db.js';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { sessionsRouter } from './routes/sessions.js';
import { shareRouter } from './routes/share.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
// Vite (dev) and Render (prod) both sit one hop in front of Express.
app.set('trust proxy', 1);

function forwardedProto(req) {
  return String(req.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

app.use((req, res, next) => {
  if (!isProd) return next();
  // Never redirect CORS preflight — browsers treat that as a failed fetch (status 0).
  if (req.method === 'OPTIONS') return next();
  const host = (req.hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return next();
  if (req.secure || forwardedProto(req) === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    return next();
  }
  const hdrHost = req.get('host');
  if (!hdrHost) return next();
  return res.redirect(301, `https://${hdrHost}${req.originalUrl}`);
});

// CORS: allow Vercel frontend(s). In production, allow any HTTPS origin so new Vercel URLs work without redeploy.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (process.env.NODE_ENV === 'production' && origin.startsWith('https://')) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.use(express.json());

function makeLimiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    // Render may send extra X-Forwarded-For hops; don't crash the request.
    validate: { xForwardedForHeader: false },
    skip: (req) => req.method === 'OPTIONS',
  });
}

const authLimiter = makeLimiter(20, 'Too many attempts. Please try again later.');
const shareLimiter = makeLimiter(120, 'Too many requests. Please try again later.');

let dbReady = false;
let dbInitError = null;

app.get('/api/health', (_, res) => {
  if (!dbReady) {
    return res.status(503).json({
      ok: false,
      db: dbDriver,
      error: dbInitError || 'starting',
    });
  }
  const body = { ok: true, db: dbDriver };
  if (process.env.NODE_ENV === 'production' && dbDriver === 'sqlite') {
    body.warning =
      'Ephemeral SQLite — data is lost on every deploy. Set DATABASE_URL to Render PostgreSQL Internal URL.';
  }
  res.status(dbDriver === 'unknown' ? 503 : 200).json(body);
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!dbReady) {
    return res.status(503).json({
      error: 'Server is waking up. Please try again in a moment.',
    });
  }
  next();
});

async function start() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
  server.on('error', (err) => {
    console.error('Failed to bind port:', err.message);
    process.exit(1);
  });

  try {
    const db = await initDb();
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth', authRouter(db));
    app.use('/api/workouts', authMiddleware, workoutsRouter(db));
    app.use('/api/sessions', authMiddleware, sessionsRouter(db));
    app.use('/api/share', shareLimiter, shareRouter(db));
    dbReady = true;
    dbInitError = null;
  } catch (err) {
    dbInitError = err?.message || 'database init failed';
    console.error('Failed to initialize database:', dbInitError);
    if (process.env.NODE_ENV === 'production') {
      console.error('Keeping process alive so /api/health can respond (503) instead of hanging the proxy.');
    }
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
