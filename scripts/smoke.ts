import jsQRModule from 'jsqr';
import { PNG } from 'pngjs';

const jsQR = jsQRModule.default;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing environment variable ${name}`);
    process.exit(2);
  }
  return value;
}

const issuer = requireEnv('AUTH0_ISSUER_BASE_URL').replace(/\/+$/, '');
const audience = requireEnv('AUTH0_AUDIENCE');
const baseUrl = requireEnv('BASE_URL').replace(/\/+$/, '');

let failures = 0;
const check = (cond: boolean, msg: string, detail = '') => {
  if (cond) {
    console.log(`  ✅ ${msg}`);
  } else {
    failures++;
    console.log(`  ❌ ${detail ? `${msg} → ${detail}` : msg}`);
  }
};

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });
  if (!res.ok) {
    console.error(`Token request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

const api = (path: string, init: RequestInit = {}, token?: string) =>
  fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

console.log(`\nSmoke test against ${baseUrl}`);

const automatToken = await getToken(requireEnv('AUTOMAT_CLIENT_ID'), requireEnv('AUTOMAT_CLIENT_SECRET'));
const readonlyToken = await getToken(requireEnv('READONLY_CLIENT_ID'), requireEnv('READONLY_CLIENT_SECRET'));
const body = JSON.stringify({ name: 'Smoke Test', document: `SMOKE-${Date.now()}` });
const unknownId = '00000000-0000-4000-8000-000000000000';

console.log('\nPOST /passes');
check((await api('/passes', { method: 'POST', body })).status === 401, 'no token → 401');
check((await api('/passes', { method: 'POST', body }, readonlyToken)).status === 403, 'read-only token → 403');
check(
  (await api('/passes', { method: 'POST', body: JSON.stringify({ name: ' ', document: 'X' }) }, automatToken)).status === 400,
  'blank name → 400',
);

const created = await api('/passes', { method: 'POST', body }, automatToken);
const location = created.headers.get('location') ?? '';
const id = location.split('/').pop() ?? '';
check(created.status === 201, `valid request → 201 (${created.status})`);
check(created.headers.get('content-type') === 'image/png', `content-type = ${created.headers.get('content-type')}`);
check(location === `${baseUrl}/passes/${id}`, `Location = ${location}`);

const png = PNG.sync.read(Buffer.from(await created.arrayBuffer()));
const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
check(qr === `${baseUrl}/info/${id}`, `QR encodes ${qr}`);

console.log('\nGET /passes/:id');
check((await api(`/passes/${id}`)).status === 401, 'no token → 401');
const read = await api(`/passes/${id}`, {}, readonlyToken);
const pass = (await read.json()) as Record<string, unknown>;
check(read.status === 200, `read-only token → 200 (${read.status})`);
check(pass.id === id && pass.name === 'Smoke Test' && pass.status === 'ACTIVE', `body = ${JSON.stringify(pass)}`);
check((await api(`/passes/${unknownId}`, {}, readonlyToken)).status === 404, 'unknown id → 404');

console.log('\nPublic pages');
check((await api('/')).status === 200, 'GET / → 200');
check((await api(`/info/${id}`)).status === 200, 'GET /info/<new id> → 200');
check((await api(`/info/${unknownId}`)).status === 404, 'GET /info/<unknown id> → 404');

console.log(failures === 0 ? '\n✅ All smoke checks passed.\n' : `\n❌ Failed checks: ${failures}\n`);
process.exit(failures === 0 ? 0 : 1);
