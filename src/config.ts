export interface Config {
  port: number;
  baseUrl: string;
  isProduction: boolean;
  db: {
    connectionString: string;
    ssl: boolean;
  };
  auth0: {
    issuerBaseUrl: string;
    audience: string;
    clientId: string;
    clientSecret: string;
  };
  sessionSecret: string;
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
}

function parseSessionSecret(env: Env): string {
  const secret = required(env, 'SESSION_SECRET');
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }
  return secret;
}

function parseBaseUrl(env: Env): string {
  const raw = env.BASE_URL?.trim() || env.RENDER_EXTERNAL_URL?.trim();
  if (!raw) {
    throw new Error('Missing BASE_URL (or RENDER_EXTERNAL_URL)');
  }
  const url = new URL(raw);
  return url.origin + url.pathname.replace(/\/+$/, '');
}

export function loadConfig(env: Env = process.env): Config {
  return {
    port: parsePort(env.PORT),
    baseUrl: parseBaseUrl(env),
    isProduction: env.NODE_ENV === 'production',
    db: {
      connectionString: required(env, 'DATABASE_URL'),
      ssl: env.DATABASE_SSL === 'true',
    },
    auth0: {
      issuerBaseUrl: required(env, 'AUTH0_ISSUER_BASE_URL'),
      audience: required(env, 'AUTH0_AUDIENCE'),
      clientId: required(env, 'AUTH0_CLIENT_ID'),
      clientSecret: required(env, 'AUTH0_CLIENT_SECRET'),
    },
    sessionSecret: parseSessionSecret(env),
  };
}
