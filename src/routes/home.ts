import { Router } from 'express';
import type { PassesRepo } from '../db/passesRepo.js';

export function homeRouter(passes: PassesRepo): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const stats = await passes.stats();
    res.render('home', { title: 'Digital Passes', stats });
  });

  return router;
}
