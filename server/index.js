import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { sessionsRouter } from './routes/sessions.js';
import { shareRouter } from './routes/share.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: allow Vercel frontend(s). If CORS_ORIGIN is set, use it; else allow localhost + any *.vercel.app
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/workouts', authMiddleware, workoutsRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/share', shareRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
