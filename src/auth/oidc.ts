import type { Handler } from 'express';
import { auth } from 'express-openid-connect';
import type { Config } from '../config.js';

export function createOidc(config: Config): Handler {
  return auth({
    authRequired: false,
    idpLogout: true,
    baseURL: config.baseUrl,
    issuerBaseURL: config.auth0.issuerBaseUrl,
    clientID: config.auth0.clientId,
    clientSecret: config.auth0.clientSecret,
    secret: config.sessionSecret,
    authorizationParams: {
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid profile email',
    },
  });
}

export const requireUser: Handler = (req, res, next) => {
  if (req.oidc.isAuthenticated()) {
    next();
    return;
  }
  res.redirect(303, '/login');
};

export function requireSameOrigin(baseUrl: string): Handler {
  const allowedOrigin = new URL(baseUrl).origin;
  return (req, res, next) => {
    const origin = req.get('Origin');
    if (origin && origin !== allowedOrigin) {
      res.status(403).render('message', {
        code: 403,
        title: 'Forbidden',
        message: 'Cross-origin requests are not allowed.',
      });
      return;
    }
    next();
  };
}
