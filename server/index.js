import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { sessionsRouter } from './routes/sessions.js';
import { shareRouter } from './routes/share.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/workouts', authMiddleware, workoutsRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/share', shareRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
