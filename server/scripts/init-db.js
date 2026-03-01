// Loading db.js creates the schema (CREATE TABLE IF NOT EXISTS). No separate DB binary.
import '../db.js';

console.log('Database initialized (schema ensured via server/db.js).');
