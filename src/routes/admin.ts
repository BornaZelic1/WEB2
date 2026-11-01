import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireSameOrigin, requireUser } from '../auth/oidc.js';
import type { PassesRepo } from '../db/passesRepo.js';
import { isUuid } from '../lib/validate.js';

export interface AdminDeps {
  passes: PassesRepo;
  baseUrl: string;
}

function renderPassNotFound(res: Response): void {
  res.status(404).render('message', {
    code: 404,
    title: 'Pass not found',
    message: 'No pass exists with this identifier.',
  });
}

export function adminRouter({ passes, baseUrl }: AdminDeps): Router {
  const router = Router();

  router.use(requireSameOrigin(baseUrl), requireUser);

  router.post('/passes/:id/cancel', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id) || !(await passes.cancel(id))) {
      renderPassNotFound(res);
      return;
    }
    res.redirect(303, '/?done=cancelled');
  });

  router.post('/passes/:id/delete', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id) || !(await passes.remove(id))) {
      renderPassNotFound(res);
      return;
    }
    res.redirect(303, '/?done=deleted');
  });

  return router;
}
