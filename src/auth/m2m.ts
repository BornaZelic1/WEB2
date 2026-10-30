import type { Handler } from 'express';
import { auth, InsufficientScopeError, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import type { Config } from '../config.js';

export const SCOPES = {
  readPasses: 'read:passes',
  createPasses: 'create:passes',
} as const;

export function createJwtCheck({ issuerBaseUrl, audience }: Config['auth0']): Handler {
  return auth({ issuerBaseURL: issuerBaseUrl, audience });
}

export function authErrorStatus(err: unknown): 401 | 403 | null {
  if (err instanceof InsufficientScopeError) {
    return 403;
  }
  if (err instanceof UnauthorizedError) {
    return 401;
  }
  return null;
}
