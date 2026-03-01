import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'workout-secret-change-in-production';

export function authRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const id = nanoid();
    const password_hash = bcrypt.hashSync(password, 10);
    try {
      await db.prepare(
        'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
      ).run(id, email.trim().toLowerCase(), password_hash);
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, userId: id, email: email.trim().toLowerCase() });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || (e.message && e.message.includes('UNIQUE')) || e.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw e;
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await db.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).get(email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, email: user.email });
  });

  router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      const user = await db.prepare('SELECT id, email FROM users WHERE id = ?').get(payload.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      res.json({ userId: user.id, email: user.email });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
