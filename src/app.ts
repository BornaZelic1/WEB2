import express from 'express';
import type { ErrorRequestHandler, Express } from 'express';
import type { Pool } from 'pg';
import { healthRouter } from './routes/health.js';

export interface AppDeps {
  pool: Pool;
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};

export function createApp({ pool }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(healthRouter(pool));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
  app.use(errorHandler);

  return app;
}
