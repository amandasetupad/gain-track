import { initDb } from '../db.js';

await initDb();
console.log('Database initialized (schema ensured).');
if (process.env.DATABASE_URL) {
  console.log('Using PostgreSQL (DATABASE_URL).');
} else {
  console.log('Using SQLite (server/data/workouts.db).');
}
