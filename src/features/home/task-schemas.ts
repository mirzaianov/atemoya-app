import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Please enter a task'),
});

export const taskIdSchema = z.object({
  id: z.string().min(1, 'Missing task id'),
});

export const taskCompletionSchema = taskIdSchema.extend({
  completed: z.boolean(),
});

export const taskOrderSchema = z.object({
  ids: z.array(z.string().min(1, 'Missing task id')).min(1, 'Missing task order'),
});

export const taskWithIdSchema = taskSchema.extend(taskIdSchema.shape);

export type TaskFormValues = z.infer<typeof taskSchema>;
