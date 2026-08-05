import { z } from 'zod';

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a tag')
  .max(32, 'Tag must be 32 characters or fewer')
  .transform((name) => name.toLowerCase());

export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/u, 'Choose a valid color')
  .transform((color) => color.toLowerCase());

export const tagSchema = z.object({
  color: tagColorSchema,
  name: tagNameSchema,
});

export const tagIdSchema = z.object({
  id: z.string().uuid('Invalid tag'),
});

export const tagWithIdSchema = tagSchema.extend(tagIdSchema.shape);

export type TagFormValues = z.infer<typeof tagSchema>;
