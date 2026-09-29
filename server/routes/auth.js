import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'workout-secret-change-in-production';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using an insecure default. Set JWT_SECRET in the server environment.');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function authRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email, password, website } = req.body || {};
    if (typeof website === 'string' && website.trim() !== '') {
      return res.status(400).json({ error: 'Registration failed' });
    }
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const id = nanoid();
    const password_hash = bcrypt.hashSync(password, 10);
    try {
      await db.prepare(
        'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
      ).run(id, normalized, password_hash);
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, userId: id, email: normalized });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || (e.message && e.message.includes('UNIQUE')) || e.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw e;
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (!EMAIL_RE.test(normalized)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    const user = await db.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).get(normalized);
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
