import type { Pool } from 'pg';
import type { PassRow, PassStats } from '../types.js';

export interface PassesRepo {
  stats(): Promise<PassStats>;
  findById(id: string): Promise<PassRow | null>;
}

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
      const { rows } = await pool.query<PassRow>(
        'SELECT id, name, document, issued_at, status FROM passes WHERE id = $1',
        [id],
      );
      return rows[0] ?? null;
    },
  };
}
