import { Router } from 'express';
import type { PassesRepo } from '../db/passesRepo.js';
import { isUuid } from '../lib/validate.js';

export function infoRouter(passes: PassesRepo): Router {
  const router = Router();

  router.get('/info/:id', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    const { id } = req.params;
    const pass = isUuid(id) ? await passes.findById(id) : null;

    if (!pass) {
      res.status(404).render('not-found', {
        title: 'Pass not found',
        message: 'No pass exists with this identifier.',
        noindex: true,
      });
      return;
    }

    res.render('info', { title: 'Pass details', pass, noindex: true });
  });

  return router;
}
