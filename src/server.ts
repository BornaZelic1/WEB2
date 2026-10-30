import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { ensureSchema } from './db/schema.js';

const config = loadConfig();
const pool = createPool(config.db);
await ensureSchema(pool);

const app = createApp({ config, pool });

const server = app.listen(config.port, (err) => {
  if (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
  console.log(`Server listening on port ${config.port} – ${config.baseUrl}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received – shutting down…`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
