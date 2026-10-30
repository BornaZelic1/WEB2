interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface JwtHeader {
  alg: string;
  kid?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  gty?: string;
  scope?: string;
  iat?: number;
  exp?: number;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Nedostaje env varijabla ${name}`);
    process.exit(2);
  }
  return value;
}

const issuer = requireEnv('AUTH0_ISSUER_BASE_URL').replace(/\/+$/, '');
const audience = requireEnv('AUTH0_AUDIENCE');
const webClientId = requireEnv('AUTH0_CLIENT_ID');
const webClientSecret = requireEnv('AUTH0_CLIENT_SECRET');
const automatClientId = requireEnv('AUTOMAT_CLIENT_ID');
const automatClientSecret = requireEnv('AUTOMAT_CLIENT_SECRET');
const readonlyClientId = process.env.READONLY_CLIENT_ID?.trim();
const readonlyClientSecret = process.env.READONLY_CLIENT_SECRET?.trim();
const baseUrl = (process.env.BASE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');

let failures = 0;
const ok = (msg: string) => console.log(`  ✅ ${msg}`);
const info = (msg: string) => console.log(`  ℹ️  ${msg}`);
const bad = (msg: string) => {
  failures++;
  console.log(`  ❌ ${msg}`);
};
const check = (cond: boolean, msg: string, detail = '') =>
  cond ? ok(msg) : bad(detail ? `${msg} → ${detail}` : msg);

function decodeJwt(jwt: string): { header: JwtHeader; payload: JwtPayload } {
  const [h = '', p = ''] = jwt.split('.');
  const part = (s: string): unknown => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
  return { header: part(h) as JwtHeader, payload: part(p) as JwtPayload };
}

async function requestToken(
  clientId: string,
  clientSecret: string,
  scope?: string,
): Promise<{ status: number; data: TokenResponse }> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience,
  });
  if (scope) body.set('scope', scope);

  const res = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  return { status: res.status, data };
}

const describeError = (d: TokenResponse) => `${d.error}: ${d.error_description}`;

let jwksKids: string[] = [];

function inspectToken(label: string, token: string, expectedScopes: string[], clientId: string): void {
  const { header, payload } = decodeJwt(token);
  const scopes = (payload.scope ?? '').split(' ').filter(Boolean).sort();
  const aud = ([] as string[]).concat(payload.aud ?? []);

  check(header.alg === 'RS256', `${label}: alg = ${header.alg}`);
  check(header.kid !== undefined && jwksKids.includes(header.kid), `${label}: kid postoji u JWKS`);
  check(payload.iss === `${issuer}/`, `${label}: iss ispravan`);
  check(aud.includes(audience), `${label}: aud = ${aud.join(', ')}`);
  check(payload.gty === 'client-credentials', `${label}: gty = ${payload.gty}`);
  check(payload.azp === clientId, `${label}: azp odgovara client_id`);
  check(
    scopes.join(' ') === [...expectedScopes].sort().join(' '),
    `${label}: scope = "${scopes.join(' ')}"`,
    `očekivano "${expectedScopes.join(' ')}"`,
  );
  if (payload.exp !== undefined && payload.iat !== undefined) {
    info(`${label}: token vrijedi ${(payload.exp - payload.iat) / 3600} h`);
  }
}

console.log(`\nAuth0: ${issuer}\nAudience: ${audience}\nBASE_URL: ${baseUrl}`);

console.log('\n1) Tenant (OIDC discovery + JWKS)');
{
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  check(res.ok, `discovery dostupan (${res.status})`);
  const discovery = (await res.json()) as { issuer: string; jwks_uri: string };
  check(discovery.issuer === `${issuer}/`, `issuer = ${discovery.issuer}`);
  const jwks = (await (await fetch(discovery.jwks_uri)).json()) as { keys: { kid: string }[] };
  jwksKids = jwks.keys.map((k) => k.kid);
  check(jwksKids.length > 0, `JWKS ima ${jwksKids.length} ključ(a)`);
}

console.log('\n2) M2M "Automat" – oba opsega');
{
  const { status, data } = await requestToken(automatClientId, automatClientSecret);
  check(status === 200 && !!data.access_token, `token izdan (${status})`, describeError(data));
  if (data.access_token) {
    inspectToken('Automat', data.access_token, ['read:passes', 'create:passes'], automatClientId);
  }
}

console.log('\n3) M2M "Automat-readonly" – samo read:passes');
if (readonlyClientId && readonlyClientSecret) {
  const { status, data } = await requestToken(readonlyClientId, readonlyClientSecret);
  check(status === 200 && !!data.access_token, `token izdan (${status})`, describeError(data));
  if (data.access_token) {
    inspectToken('Readonly', data.access_token, ['read:passes'], readonlyClientId);
  }

  const denied = await requestToken(readonlyClientId, readonlyClientSecret, 'create:passes');
  check(denied.status === 403, `zahtjev za create:passes odbijen (${denied.status} ${denied.data.error})`);
} else {
  info('READONLY_CLIENT_ID/SECRET nisu postavljeni – preskačem');
}

console.log('\n4) Regular Web App "Passes Web" – vjerodajnice');
{
  const { status, data } = await requestToken(webClientId, webClientSecret);
  if (status === 200) {
    bad('Passes Web dobiva M2M token za API – ukloni mu pristup (API → Application Access)');
  } else {
    check(status === 403, `vjerodajnice ispravne, bez pristupa API-ju (${status} ${data.error})`, describeError(data));
  }
}

console.log(`\n5) Passes Web – Allowed Callback URL (${baseUrl}/callback)`);
{
  const url = new URL(`${issuer}/authorize`);
  url.search = new URLSearchParams({
    client_id: webClientId,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: `${baseUrl}/callback`,
    state: 'check',
    nonce: 'check',
  }).toString();
  const res = await fetch(url, { redirect: 'manual' });
  const location = decodeURIComponent(res.headers.get('location') ?? '');
  const mismatch = /callback url mismatch|error=/i.test(location);
  check(
    res.status === 302 && !mismatch,
    `authorize preusmjerava na login (${res.status} → ${location.split('?')[0]})`,
    location.slice(0, 200),
  );
}

console.log(`\n6) Passes Web – Allowed Logout URL (${baseUrl})`);
{
  const url = new URL(`${issuer}/v2/logout`);
  url.search = new URLSearchParams({ client_id: webClientId, returnTo: baseUrl }).toString();
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  check(
    res.status === 302 && location.startsWith(baseUrl),
    `logout vraća na aplikaciju (${res.status} → ${location || '(nema)'})`,
    `${baseUrl} nije u Allowed Logout URLs`,
  );
}

console.log('\n7) Registracija isključena (Disable Sign Ups)');
{
  const res = await fetch(`${issuer}/dbconnections/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: webClientId,
      connection: 'Username-Password-Authentication',
      email: `signup-check-${Date.now()}@web2.local`,
      password: 'x',
    }),
  });
  const text = await res.text();
  check(/signup is disabled|operation_not_allowed/i.test(text), `registracija odbijena (${res.status})`, text.slice(0, 200));
}

console.log(failures === 0 ? '\n✅ Sve provjere prošle.\n' : `\n❌ Neuspjelih provjera: ${failures}\n`);
process.exit(failures === 0 ? 0 : 1);
