import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';
import { matchesSearch } from '../lib/search';

export interface TaskDto {
  id: string;
  name: string;
  description: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  icon: string;
  tasks: TaskDto[];
}

const categoryOrder = { sortOrder: 'asc' } as const;
const taskOrder = { sortOrder: 'asc' } as const;

function toCategories(
  rows: Prisma.TaskCategoryGetPayload<{ include: { tasks: true } }>[],
): CategoryDto[] {
  return rows
    .filter((c) => c.tasks.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      tasks: c.tasks.map((t) => ({ id: t.id, name: t.name, description: t.description })),
    }));
}

/**
 * The full catalogue grouped by category, optionally filtered by a search term.
 * The catalogue is small (tens of rows), so filtering happens in memory, which lets
 * "wifi" match "Wi-Fi" (see lib/search.ts). Move this into SQL if the catalogue grows.
 */
export async function listCatalogue(prisma: PrismaClient, q?: string): Promise<CategoryDto[]> {
  const rows = await prisma.taskCategory.findMany({
    orderBy: categoryOrder,
    include: { tasks: { orderBy: taskOrder } },
  });
  const term = q?.trim() ?? '';
  return toCategories(
    rows.map((c) => ({
      ...c,
      tasks: c.tasks.filter((t) => matchesSearch(term, [t.name, t.description, c.name])),
    })),
  );
}

export async function getUserTasks(prisma: PrismaClient, userId: string): Promise<CategoryDto[]> {
  const rows = await prisma.taskCategory.findMany({
    orderBy: categoryOrder,
    include: { tasks: { where: { users: { some: { userId } } }, orderBy: taskOrder } },
  });
  return toCategories(rows);
}

/** Replaces the user's selection with `taskIds` in one transaction. */
export async function saveUserTasks(
  prisma: PrismaClient,
  userId: string,
  taskIds: string[],
): Promise<CategoryDto[]> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { userId: true } });
  if (!profile) {
    throw new AppError(409, 'PROFILE_REQUIRED', 'Please complete your profile before choosing tasks.');
  }

  const found = await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true } });
  if (found.length !== taskIds.length) {
    const known = new Set(found.map((t) => t.id));
    const unknownIds = taskIds.filter((id) => !known.has(id));
    throw new AppError(400, 'UNKNOWN_TASKS', 'Some selected tasks are no longer available. Please refresh.', {
      unknownIds,
    });
  }

  await prisma.$transaction([
    prisma.userTask.deleteMany({ where: { userId } }),
    prisma.userTask.createMany({ data: taskIds.map((taskId) => ({ userId, taskId })) }),
  ]);
  return getUserTasks(prisma, userId);
}
