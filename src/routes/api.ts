import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import type { ErrorRequestHandler, Handler, Request, Response } from 'express';
import { requiredScopes, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import QRCode from 'qrcode';
import { authErrorStatus, SCOPES } from '../auth/m2m.js';
import type { PassesRepo } from '../db/passesRepo.js';
import { toPassDto } from '../lib/format.js';
import { isUuid, parsePassInput } from '../lib/validate.js';

export interface ApiDeps {
  passes: PassesRepo;
  checkJwt: Handler;
  baseUrl: string;
}

const AUTH_ERROR_MESSAGES = {
  401: 'Missing or invalid access token',
  403: 'Insufficient scope',
} as const;

const apiErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const authStatus = authErrorStatus(err);
  if (authStatus !== null) {
    if (err instanceof UnauthorizedError) {
      res.set(err.headers);
    }
    res.status(authStatus).json({ error: AUTH_ERROR_MESSAGES[authStatus] });
    return;
  }

  const status: unknown = err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};

export function apiRouter({ passes, checkJwt, baseUrl }: ApiDeps): Router {
  const router = Router();

  router.get(
    '/:id',
    checkJwt,
    requiredScopes(SCOPES.readPasses),
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const pass = isUuid(id) ? await passes.findById(id) : null;

      if (!pass) {
        res.status(404).json({ error: 'Pass not found' });
        return;
      }

      res.json(toPassDto(pass));
    },
  );

  router.post(
    '/',
    checkJwt,
    requiredScopes(SCOPES.createPasses),
    express.json({ limit: '10kb' }),
    async (req, res) => {
      const input = parsePassInput(req.body);
      if (!input) {
        res.status(400).json({ error: 'Fields "name" and "document" must be non-empty strings' });
        return;
      }

      const id = randomUUID();
      const qrPng = await QRCode.toBuffer(`${baseUrl}/info/${id}`, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
      });
      await passes.create(id, input);

      res.status(201).location(`${baseUrl}/passes/${id}`).type('png').send(qrPng);
    },
  );

  router.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
  router.use(apiErrorHandler);

  return router;
}
