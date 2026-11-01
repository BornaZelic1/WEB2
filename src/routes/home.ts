import { Router } from 'express';
import type { PassesRepo } from '../db/passesRepo.js';

const NOTICES: Record<string, string> = {
  cancelled: 'The pass has been cancelled.',
  deleted: 'The pass has been deleted.',
};

export function homeRouter(passes: PassesRepo): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const isAuthenticated = req.oidc.isAuthenticated();
    const stats = await passes.stats();
    const list = isAuthenticated ? await passes.list() : [];
    const done = req.query.done;
    const notice = typeof done === 'string' ? (NOTICES[done] ?? null) : null;

    if (isAuthenticated) {
      res.set('Cache-Control', 'no-store');
    }
    res.render('home', { title: 'Digital Passes', stats, passes: list, notice });
  });

  return router;
}
