import { z } from 'zod';

export const taskSchema = z.object({
  tagIds: z
    .array(z.string().uuid('Invalid tag'))
    .max(10, 'Choose no more than 10 tags')
    .refine((ids) => new Set(ids).size === ids.length, 'Choose each tag once')
    .default([]),
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

export type TaskFormInput = z.input<typeof taskSchema>;
export type TaskFormValues = z.output<typeof taskSchema>;
