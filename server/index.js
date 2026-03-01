import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { sessionsRouter } from './routes/sessions.js';
import { shareRouter } from './routes/share.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

async function start() {
  const db = await initDb();
  console.log(process.env.DATABASE_URL ? 'Using PostgreSQL (DATABASE_URL)' : 'Using SQLite (server/data/workouts.db)');

  app.use('/api/auth', authRouter(db));
  app.use('/api/workouts', authMiddleware, workoutsRouter(db));
  app.use('/api/sessions', authMiddleware, sessionsRouter(db));
  app.use('/api/share', shareRouter(db));

  app.get('/api/health', (_, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
