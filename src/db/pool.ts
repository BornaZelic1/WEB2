import pg from 'pg';
import type { Config } from '../config.js';

export function createPool(db: Config['db']): pg.Pool {
  const pool = new pg.Pool({
    connectionString: db.connectionString,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('Neočekivana greška na konekciji prema bazi:', err.message);
  });

  return pool;
}
