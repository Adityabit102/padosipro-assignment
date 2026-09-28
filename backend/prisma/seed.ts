import { PrismaClient } from '@prisma/client';
import { catalogue } from '../src/data/catalogue';

/** Idempotent: safe to run on every container start. */
export async function seedCatalogue(prisma: PrismaClient): Promise<number> {
  let taskCount = 0;
  for (const [ci, category] of catalogue.entries()) {
    const categoryData = { name: category.name, icon: category.icon, sortOrder: ci };
    await prisma.taskCategory.upsert({
      where: { id: category.id },
      create: { id: category.id, ...categoryData },
      update: categoryData,
    });
    for (const [ti, task] of category.tasks.entries()) {
      const taskData = { categoryId: category.id, name: task.name, description: task.description, sortOrder: ti };
      await prisma.task.upsert({ where: { id: task.id }, create: { id: task.id, ...taskData }, update: taskData });
      taskCount++;
    }
  }
  return taskCount;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCatalogue(prisma)
    .then((n) => process.stdout.write(`Seeded ${catalogue.length} categories and ${n} tasks\n`))
    .catch((err) => {
      process.stderr.write(`Seeding failed: ${err}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
