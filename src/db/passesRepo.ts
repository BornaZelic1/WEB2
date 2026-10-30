import type { Pool } from 'pg';
import type { PassInput, PassRow, PassStats } from '../types.js';

export interface PassesRepo {
  stats(): Promise<PassStats>;
  findById(id: string): Promise<PassRow | null>;
  create(id: string, input: PassInput): Promise<PassRow>;
}

const PASS_COLUMNS = 'id, name, document, issued_at, status';

export function createPassesRepo(pool: Pool): PassesRepo {
  return {
    async stats() {
      const { rows } = await pool.query<PassStats>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'ACTIVE')::int AS active
           FROM passes`,
      );
      return rows[0] ?? { total: 0, active: 0 };
    },

    async findById(id) {
      const { rows } = await pool.query<PassRow>(`SELECT ${PASS_COLUMNS} FROM passes WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async create(id, { name, document }) {
      const { rows } = await pool.query<PassRow>(
        `INSERT INTO passes (id, name, document) VALUES ($1, $2, $3) RETURNING ${PASS_COLUMNS}`,
        [id, name, document],
      );
      const row = rows[0];
      if (!row) {
        throw new Error('Insert did not return a row');
      }
      return row;
    },
  };
}
