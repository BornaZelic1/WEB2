export interface Config {
  port: number;
  baseUrl: string;
  isProduction: boolean;
  db: {
    connectionString: string;
    ssl: boolean;
  };
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Nedostaje obavezna env varijabla ${name}`);
  }
  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Neispravan PORT: ${value}`);
  }
  return port;
}

function parseBaseUrl(env: Env): string {
  const raw = env.BASE_URL?.trim() || env.RENDER_EXTERNAL_URL?.trim();
  if (!raw) {
    throw new Error('Nedostaje BASE_URL (ili RENDER_EXTERNAL_URL)');
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
  };
}
