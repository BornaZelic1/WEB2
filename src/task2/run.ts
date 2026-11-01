import { getToken, issuePass } from './automat.js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing environment variable ${name}`);
    process.exit(2);
  }
  return value;
}

const [name, document] = process.argv.slice(2);
if (!name || !document) {
  console.error('Usage: npm run automat -- "<name>" "<document>"');
  process.exit(2);
}

try {
  const token = await getToken(
    requireEnv('AUTH0_ISSUER_BASE_URL'),
    requireEnv('AUTH0_AUDIENCE'),
    requireEnv('AUTOMAT_CLIENT_ID'),
    requireEnv('AUTOMAT_CLIENT_SECRET'),
    'create:passes'
  );
  await issuePass(requireEnv('AUTOMAT_PASSES_URL'), token, name, document);
  console.log(`Pass issued for ${name} (${document}); QR code saved to ${process.cwd()}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
