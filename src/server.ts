import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { ensureSchema } from './db/schema.js';

const config = loadConfig();
const pool = createPool(config.db);
await ensureSchema(pool);

const app = createApp({ pool });

const server = app.listen(config.port, (err) => {
  if (err) {
    console.error('Server se ne može pokrenuti:', err.message);
    process.exit(1);
  }
  console.log(`Server sluša na portu ${config.port} – ${config.baseUrl}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} – gasim server…`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
