import path from 'node:path';
import express from 'express';
import type { ErrorRequestHandler, Express } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import type { Config } from './config.js';
import { createPassesRepo } from './db/passesRepo.js';
import { formatDateTime } from './lib/format.js';
import { healthRouter } from './routes/health.js';
import { homeRouter } from './routes/home.js';
import { infoRouter } from './routes/info.js';

export interface AppDeps {
  config: Config;
  pool: Pool;
}

const rootDir = path.resolve(import.meta.dirname, '..');

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).render('error', { title: 'Something went wrong' });
};

export function createApp({ config, pool }: AppDeps): Express {
  const app = express();
  const passes = createPassesRepo(pool);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(rootDir, 'views'));
  app.locals.formatDateTime = formatDateTime;

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: config.isProduction ? [] : null },
      },
    }),
  );
  app.use('/static', express.static(path.join(rootDir, 'public'), { maxAge: config.isProduction ? '1h' : 0 }));

  app.use(healthRouter(pool));
  app.use(homeRouter(passes));
  app.use(infoRouter(passes));

  app.use((_req, res) => {
    res.status(404).render('not-found', {
      title: 'Page not found',
      message: 'The page you are looking for does not exist.',
    });
  });
  app.use(errorHandler);

  return app;
}
