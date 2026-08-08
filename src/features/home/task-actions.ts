'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import {
  createTask,
  deleteTask,
  getTask,
  reorderTasks,
  setTaskCompleted,
  TaskQueryError,
  taskTitleExists,
  updateTask,
} from '../../db/queries';
import type { TaskRecord } from '../../db/queries';
import { auth } from '../../lib/auth';
import type { Task } from '../../types';
import {
  taskCompletionSchema,
  taskIdSchema,
  taskOrderSchema,
  taskSchema,
  taskWithIdSchema,
} from './task-schemas';
import type { TaskFormInput } from './task-schemas';

interface ActionResult {
  error?: string;
  task?: Task;
}

const serializeTask = (record: TaskRecord | null): Task | null => {
  if (!record) {
    return null;
  }

  const { changedOn, completedAt, ...task } = record;

  return {
    ...task,
    changedOn: changedOn.getTime(),
    completedAt: completedAt?.getTime() ?? null,
  };
};

const getUserId = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
};

const isDuplicateTitle = (error: unknown) =>
  error instanceof TaskQueryError && error.code === 'DUPLICATE_TITLE';

const isInvalidTags = (error: unknown) =>
  error instanceof TaskQueryError && error.code === 'INVALID_TAGS';

export const createTaskAction = async (values: TaskFormInput): Promise<ActionResult> => {
  const parsed = taskSchema.safeParse(values);

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
    const id = await createTask(userId, parsed.data.title, parsed.data.tagIds);
    const task = serializeTask(await getTask(userId, id));

    if (!task) {
      return { error: 'Task could not be added. Please refresh and try again.' };
    }

    revalidatePath('/');

    return { task };
  } catch (error) {
    if (isDuplicateTitle(error)) {
      return { error: 'Task already exists' };
    }

    if (isInvalidTags(error)) {
      return { error: 'Choose valid tags and try again.' };
    }

    throw error;
  }
};

export const updateTaskAction = async (
  id: string,
  values: TaskFormInput,
): Promise<ActionResult> => {
  const parsed = taskWithIdSchema.safeParse({ ...values, id });

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
    const updated = await updateTask(userId, parsed.data.id, parsed.data.title, parsed.data.tagIds);

    if (!updated) {
      return { error: 'Task could not be updated. Please refresh and try again.' };
    }

    const task = serializeTask(await getTask(userId, parsed.data.id));

    if (!task) {
      return { error: 'Task could not be updated. Please refresh and try again.' };
    }

    revalidatePath('/');

    return { task };
  } catch (error) {
    if (isDuplicateTitle(error)) {
      return { error: 'Task already exists' };
    }

    if (isInvalidTags(error)) {
      return { error: 'Choose valid tags and try again.' };
    }

    throw error;
  }
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
