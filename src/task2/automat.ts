import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export async function getToken(
  authority: string,
  audience: string,
  clientId: string,
  clientSecret: string,
  scope: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience,
  });
  if (scope) {
    body.set('scope', scope);
  }

  const response = await fetch(`${authority.replace(/\/+$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token?: unknown };
  if (typeof data.access_token !== 'string' || data.access_token === '') {
    throw new Error(`Token response with status ${response.status} does not contain an access token`);
  }

  return data.access_token;
}

export async function issuePass(
  url: string,
  token: string,
  name: string,
  document: string
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'image/png',
    },
    body: JSON.stringify({ name, document }),
  });

  if (response.status !== 201) {
    throw new Error(`Issuing pass failed with status ${response.status} ${response.statusText}`);
  }

  const location = response.headers.get('Location');
  if (!location) {
    throw new Error(`Response with status ${response.status} does not contain a Location header`);
  }

  const id = new URL(location, url).pathname.split('/').filter(Boolean).pop() ?? '';
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`Location header does not end with a valid pass identifier: ${location}`);
  }

  const image = Buffer.from(await response.arrayBuffer());
  await writeFile(`${id}.png`, image);
}
