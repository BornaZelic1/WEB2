import path from 'node:path';
import express from 'express';
import type { ErrorRequestHandler, Express, Handler } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import type { Config } from './config.js';
import { createPassesRepo } from './db/passesRepo.js';
import { formatDateTime } from './lib/format.js';
import { adminRouter } from './routes/admin.js';
import { apiRouter } from './routes/api.js';
import { healthRouter } from './routes/health.js';
import { homeRouter } from './routes/home.js';
import { infoRouter } from './routes/info.js';

export interface AppDeps {
  config: Config;
  pool: Pool;
  checkJwt: Handler;
  oidc: Handler;
}

const rootDir = path.resolve(import.meta.dirname, '..');

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status: unknown = err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).render('message', {
      code: status,
      title: 'Request failed',
      message: 'The request could not be completed. Please try again.',
    });
    return;
  }

  console.error(err);
  res.status(500).render('message', {
    code: 500,
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again later.',
  });
};

const exposeUser: Handler = (req, res, next) => {
  res.locals.user = req.oidc.isAuthenticated() ? (req.oidc.user ?? null) : null;
  next();
};

export function createApp({ config, pool, checkJwt, oidc }: AppDeps): Express {
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
      referrerPolicy: { policy: 'same-origin' },
    }),
  );
  app.use('/static', express.static(path.join(rootDir, 'public'), { maxAge: config.isProduction ? '1h' : 0 }));

  app.use(healthRouter(pool));
  app.use('/passes', apiRouter({ passes, checkJwt, baseUrl: config.baseUrl }));

  app.use(oidc, exposeUser);
  app.use(homeRouter(passes));
  app.use(infoRouter(passes));
  app.use('/admin', adminRouter({ passes, baseUrl: config.baseUrl }));

  app.use((_req, res) => {
    res.status(404).render('message', {
      code: 404,
      title: 'Page not found',
      message: 'The page you are looking for does not exist.',
    });
  });
  app.use(errorHandler);

  return app;
}
