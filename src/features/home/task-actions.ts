'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import {
  createTask,
  deleteTask,
  reorderTasks,
  setTaskCompleted,
  TaskQueryError,
  taskTitleExists,
  updateTask,
} from '../../db/queries';
import { auth } from '../../lib/auth';
import {
  taskCompletionSchema,
  taskIdSchema,
  taskOrderSchema,
  taskSchema,
  taskWithIdSchema,
} from './task-schemas';

interface ActionResult {
  error?: string;
}

const getUserId = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
};

const isDuplicateTitle = (error: unknown) =>
  error instanceof TaskQueryError && error.code === 'DUPLICATE_TITLE';

export const createTaskAction = async (title: string): Promise<ActionResult> => {
  const parsed = taskSchema.safeParse({ title });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid task' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  if (await taskTitleExists(userId, parsed.data.title)) {
    return { error: 'Task already exists' };
  }

  try {
    await createTask(userId, parsed.data.title);
  } catch (error) {
    if (isDuplicateTitle(error)) {
      return { error: 'Task already exists' };
    }

    throw error;
  }
  revalidatePath('/');

  return {};
};

export const updateTaskAction = async (id: string, title: string): Promise<ActionResult> => {
  const parsed = taskWithIdSchema.safeParse({ id, title });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid task' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  if (await taskTitleExists(userId, parsed.data.title, parsed.data.id)) {
    return { error: 'Task already exists' };
  }

  try {
    await updateTask(userId, parsed.data.id, parsed.data.title);
  } catch (error) {
    if (isDuplicateTitle(error)) {
      return { error: 'Task already exists' };
    }

    throw error;
  }
  revalidatePath('/');

  return {};
};

export const setTaskCompletedAction = async (
  id: string,
  completed: boolean,
): Promise<ActionResult> => {
  const parsed = taskCompletionSchema.safeParse({ completed, id });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid task completion state' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  const updated = await setTaskCompleted(userId, parsed.data.id, parsed.data.completed);

  if (!updated) {
    return { error: 'Task could not be updated. Please refresh and try again.' };
  }

  revalidatePath('/');

  return {};
};

export const deleteTaskAction = async (id: string): Promise<ActionResult> => {
  const parsed = taskIdSchema.safeParse({ id });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid task' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  await deleteTask(userId, parsed.data.id);
  revalidatePath('/');

  return {};
};

export const reorderTasksAction = async (ids: string[]): Promise<ActionResult> => {
  const parsed = taskOrderSchema.safeParse({ ids });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid task order' };
  }

  const userId = await getUserId();

  if (!userId) {
    return { error: 'Please sign in again.' };
  }

  const updated = await reorderTasks(userId, parsed.data.ids);

  if (!updated) {
    return {
      error: 'Task order could not be saved. Please refresh and try again.',
    };
  }

  revalidatePath('/');

  return {};
};
