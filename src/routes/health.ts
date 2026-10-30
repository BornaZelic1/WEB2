import { Router } from 'express';
import type { Pool } from 'pg';

export function healthRouter(pool: Pool): Router {
  const router = Router();

  router.get('/healthz', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('Health check – baza nedostupna:', err instanceof Error ? err.message : err);
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}
