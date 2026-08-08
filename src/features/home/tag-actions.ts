'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { createTag, deleteTag, TagQueryError, updateTag } from '../../db/tag-queries';
import { auth } from '../../lib/auth';
import type { Tag } from '../../types';
import { tagIdSchema, tagSchema, tagWithIdSchema } from './tag-schemas';
import type { TagFormValues } from './tag-schemas';

interface TagActionResult {
  error?: string;
  tag?: Tag;
}

const getUserId = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
};

const getQueryError = (error: unknown, fallback: string) => {
  if (!(error instanceof TagQueryError)) {
    throw error;
  }

  return error.code === 'DUPLICATE_TAG' ? 'Tag already exists' : fallback;
};

export const createTagAction = async (input: TagFormValues): Promise<TagActionResult> => {
  const parsed = tagSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid tag' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  try {
    const tag = await createTag(userId, parsed.data);

    revalidatePath('/');

    return { tag };
  } catch (error) {
    return { error: getQueryError(error, 'Tag could not be created. Please try again.') };
  }
};

export const updateTagAction = async (
  id: string,
  input: TagFormValues,
): Promise<TagActionResult> => {
  const parsed = tagWithIdSchema.safeParse({ ...input, id });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid tag' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  try {
    const tag = await updateTag(userId, parsed.data.id, parsed.data);

    if (!tag) {
      return { error: 'Tag could not be updated. Please refresh and try again.' };
    }

    revalidatePath('/');

    return { tag };
  } catch (error) {
    return { error: getQueryError(error, 'Tag could not be updated. Please try again.') };
  }
};

export const deleteTagAction = async (id: string): Promise<TagActionResult> => {
  const parsed = tagIdSchema.safeParse({ id });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid tag' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  try {
    const deleted = await deleteTag(userId, parsed.data.id);

    if (!deleted) {
      return { error: 'Tag could not be deleted. Please refresh and try again.' };
    }
  } catch (error) {
    return { error: getQueryError(error, 'Tag could not be deleted. Please try again.') };
  }

  revalidatePath('/');

  return {};
};
