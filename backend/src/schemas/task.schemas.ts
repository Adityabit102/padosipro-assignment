import { z } from 'zod';

export const saveTasksSchema = z.object({
  taskIds: z
    .array(z.string().trim().min(1).max(64), {
      required_error: 'taskIds is required',
      invalid_type_error: 'taskIds must be a list of task ids',
    })
    .min(1, 'Pick at least one task')
    .max(100, 'Too many tasks selected')
    .transform((ids) => [...new Set(ids)]),
});

export const taskSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
});
