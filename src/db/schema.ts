import type { Pool } from 'pg';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS passes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL CHECK (btrim(name) <> ''),
  document   TEXT        NOT NULL CHECK (btrim(document) <> ''),
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('second', now()),
  status     TEXT        NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS passes_status_idx ON passes (status);
`;

export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
}
