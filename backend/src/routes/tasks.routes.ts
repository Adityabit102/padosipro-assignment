import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { parse } from '../middleware/validate';
import { taskSearchSchema } from '../schemas/task.schemas';
import { listCatalogue } from '../services/task.service';

export function taskRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { q } = parse(taskSearchSchema, req.query);
    res.json({ categories: await listCatalogue(prisma, q) });
  });

  return router;
}
