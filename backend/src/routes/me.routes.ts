import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { authedUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';
import { profileSchema } from '../schemas/profile.schemas';
import { saveTasksSchema } from '../schemas/task.schemas';
import { getAccountSummary, saveProfile } from '../services/account.service';
import { getUserTasks, saveUserTasks } from '../services/task.service';

/** Routes for the signed-in user. Mounted behind requireAuth. */
export function meRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ user: await getAccountSummary(prisma, authedUserId(req)) });
  });

  router.put('/profile', async (req, res) => {
    const input = parse(profileSchema, req.body);
    res.json({ user: await saveProfile(prisma, authedUserId(req), input) });
  });

  router.get('/tasks', async (req, res) => {
    res.json({ categories: await getUserTasks(prisma, authedUserId(req)) });
  });

  router.put('/tasks', async (req, res) => {
    const { taskIds } = parse(saveTasksSchema, req.body);
    res.json({ categories: await saveUserTasks(prisma, authedUserId(req), taskIds) });
  });

  return router;
}
