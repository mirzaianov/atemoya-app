import { and, desc, eq, ne, sql } from 'drizzle-orm';

import { DataProtectionError } from '../lib/data-protection.ts';
import { getDataProtection } from '../lib/data-protection-config.ts';
import { logSecurityEvent } from '../lib/security-logger.ts';
import { db } from './client.ts';
import { tasks } from './schema.ts';

export interface TaskRecord {
  changedOn: Date;
  completedAt: Date | null;
  id: string;
  position: number;
  title: string;
}

export type TaskQueryErrorCode = 'DATA_UNAVAILABLE' | 'DUPLICATE_TITLE' | 'OPERATION_FAILED';

export class TaskQueryError extends Error {
  readonly code: TaskQueryErrorCode;

  constructor(code: TaskQueryErrorCode) {
    super(code);
    this.code = code;
    this.name = 'TaskQueryError';
  }
}

type TaskQueryOperation =
  | 'complete'
  | 'create'
  | 'delete'
  | 'find_duplicate'
  | 'list'
  | 'reorder'
  | 'restore'
  | 'update';

const dataProtection = getDataProtection();

const getDatabaseErrorCode = (error: unknown) => {
  let current = error;

  for (let depth = 0; depth < 2; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return null;
    }

    if ('code' in current && typeof current.code === 'string') {
      return current.code;
    }

    current = 'cause' in current ? current.cause : null;
  }

  return null;
};

const classifyTaskQueryError = (error: unknown): TaskQueryErrorCode => {
  if (error instanceof TaskQueryError) {
    return error.code;
  }

  if (error instanceof DataProtectionError) {
    return 'DATA_UNAVAILABLE';
  }

  return getDatabaseErrorCode(error) === '23505' ? 'DUPLICATE_TITLE' : 'OPERATION_FAILED';
};

const runTaskQuery = async <Result>(
  operation: TaskQueryOperation,
  query: () => Promise<Result>,
  recordId?: string,
) => {
  try {
    return await query();
  } catch (error) {
    const code = classifyTaskQueryError(error);

    logSecurityEvent({
      category: code,
      code: 'task_query_failure',
      operation,
      ...(recordId ? { recordId } : {}),
      severity: 'error',
    });

    throw error instanceof TaskQueryError ? error : new TaskQueryError(code);
  }
};

export const listTasks = (userId: string): Promise<TaskRecord[]> =>
  runTaskQuery('list', async () => {
    const records = await db
      .select({
        changedOn: tasks.changedOn,
        completedAt: tasks.completedAt,
        id: tasks.id,
        position: tasks.position,
        titleCiphertext: tasks.title,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(
        sql`${tasks.completedAt} IS NOT NULL`,
        sql`CASE WHEN ${tasks.completedAt} IS NULL THEN ${tasks.position} END`,
        desc(tasks.completedAt),
        desc(tasks.changedOn),
      );

    return records.map(({ titleCiphertext, ...record }) => ({
      ...record,
      title: dataProtection.decryptValue(titleCiphertext, {
        field: 'title',
        model: 'tasks',
        recordId: record.id,
      }),
    }));
  });

export const taskTitleExists = (userId: string, title: string, excludedId?: string) =>
  runTaskQuery(
    'find_duplicate',
    async () => {
      const titleLookup = dataProtection.taskTitleLookup(userId, title);
      const conditions = [eq(tasks.userId, userId), eq(tasks.titleLookup, titleLookup)];

      if (excludedId) {
        conditions.push(ne(tasks.id, excludedId));
      }

      const [record] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(...conditions))
        .limit(1);

      return Boolean(record);
    },
    excludedId,
  );

export const createTask = (userId: string, title: string) => {
  const id = crypto.randomUUID();

  return runTaskQuery(
    'create',
    async () => {
      const titleCiphertext = dataProtection.encryptValue(title, {
        field: 'title',
        model: 'tasks',
        recordId: id,
      });
      const titleLookup = dataProtection.taskTitleLookup(userId, title);

      await db.execute(sql`
        WITH shifted AS (
          UPDATE ${tasks}
          SET ${sql.identifier('position')} = ${tasks.position} + 1
          WHERE ${tasks.userId} = ${userId}
            AND ${tasks.completedAt} IS NULL
        )
        INSERT INTO ${tasks} (
          ${sql.identifier('id')},
          ${sql.identifier('user_id')},
          ${sql.identifier('title_ciphertext')},
          ${sql.identifier('title_lookup')},
          ${sql.identifier('changed_on')},
          ${sql.identifier('position')}
        )
        VALUES (${id}, ${userId}, ${titleCiphertext}, ${titleLookup}, now(), 0)
      `);

      return id;
    },
    id,
  );
};

export const updateTask = (userId: string, id: string, title: string) =>
  runTaskQuery(
    'update',
    async () => {
      const titleCiphertext = dataProtection.encryptValue(title, {
        field: 'title',
        model: 'tasks',
        recordId: id,
      });
      const titleLookup = dataProtection.taskTitleLookup(userId, title);
      const [task] = await db
        .update(tasks)
        .set({ changedOn: sql`now()`, title: titleCiphertext, titleLookup })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
        .returning({ id: tasks.id });

      return Boolean(task);
    },
    id,
  );

export const deleteTask = (userId: string, id: string) =>
  runTaskQuery(
    'delete',
    async () => {
      const [task] = await db
        .delete(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
        .returning({ id: tasks.id });

      return Boolean(task);
    },
    id,
  );

interface TaskCompletionRow extends Record<string, unknown> {
  updatedCount: number;
}

export const setTaskCompleted = (userId: string, id: string, completed: boolean) =>
  runTaskQuery(
    completed ? 'complete' : 'restore',
    async () => {
      const result = completed
        ? await db.execute<TaskCompletionRow>(sql`
            WITH target AS (
              SELECT ${tasks.id}, ${tasks.position}
              FROM ${tasks}
              WHERE ${tasks.userId} = ${userId}
                AND ${tasks.id} = ${id}
                AND ${tasks.completedAt} IS NULL
            ),
            completed AS (
              UPDATE ${tasks}
              SET
                ${sql.identifier('completed_at')} = now(),
                ${sql.identifier('changed_on')} = now()
              FROM target
              WHERE ${tasks.id} = target.id
                AND ${tasks.userId} = ${userId}
              RETURNING ${tasks.id}
            ),
            compacted AS (
              UPDATE ${tasks}
              SET ${sql.identifier('position')} = ${tasks.position} - 1
              FROM target
              WHERE ${tasks.userId} = ${userId}
                AND ${tasks.completedAt} IS NULL
                AND ${tasks.id} <> target.id
                AND ${tasks.position} > target.position
              RETURNING ${tasks.id}
            )
            SELECT count(*)::int AS "updatedCount"
            FROM completed
          `)
        : await db.execute<TaskCompletionRow>(sql`
            WITH target AS (
              SELECT ${tasks.id}
              FROM ${tasks}
              WHERE ${tasks.userId} = ${userId}
                AND ${tasks.id} = ${id}
                AND ${tasks.completedAt} IS NOT NULL
            ),
            shifted AS (
              UPDATE ${tasks}
              SET ${sql.identifier('position')} = ${tasks.position} + 1
              FROM target
              WHERE ${tasks.userId} = ${userId}
                AND ${tasks.completedAt} IS NULL
                AND ${tasks.id} <> target.id
              RETURNING ${tasks.id}
            ),
            restored AS (
              UPDATE ${tasks}
              SET
                ${sql.identifier('completed_at')} = NULL,
                ${sql.identifier('position')} = 0,
                ${sql.identifier('changed_on')} = now()
              FROM target
              WHERE ${tasks.id} = target.id
                AND ${tasks.userId} = ${userId}
              RETURNING ${tasks.id}
            )
            SELECT count(*)::int AS "updatedCount"
            FROM restored
          `);
      const [row] = result.rows;

      return row?.updatedCount === 1;
    },
    id,
  );

interface ReorderTasksRow extends Record<string, unknown> {
  inputCount: number;
  userCount: number;
  distinctInputCount: number;
  ownedInputCount: number;
  updatedCount: number;
}

export const reorderTasks = (userId: string, ids: string[]) =>
  runTaskQuery('reorder', async () => {
    const values = sql.join(
      ids.map((id, position) => sql`(${id}, ${position}::integer)`),
      sql`, `,
    );
    const result = await db.execute<ReorderTasksRow>(sql`
      WITH input("id", "position") AS (VALUES ${values}),
      user_tasks AS (
        SELECT ${tasks.id}
        FROM ${tasks}
        WHERE ${tasks.userId} = ${userId}
          AND ${tasks.completedAt} IS NULL
      ),
      counts AS (
        SELECT
          (SELECT count(*)::int FROM input) AS "inputCount",
          (SELECT count(*)::int FROM user_tasks) AS "userCount",
          (SELECT count(DISTINCT "id")::int FROM input) AS "distinctInputCount",
          (
            SELECT count(*)::int
            FROM input
            INNER JOIN user_tasks ON user_tasks.id = input.id
          ) AS "ownedInputCount"
      ),
      updated AS (
        UPDATE ${tasks}
        SET ${sql.identifier('position')} = input.position
        FROM input, counts
        WHERE ${tasks.id} = input.id
          AND ${tasks.userId} = ${userId}
          AND counts."inputCount" = counts."userCount"
          AND counts."inputCount" = counts."distinctInputCount"
          AND counts."inputCount" = counts."ownedInputCount"
        RETURNING ${tasks.id}
      )
      SELECT
        counts."inputCount",
        counts."userCount",
        counts."distinctInputCount",
        counts."ownedInputCount",
        (SELECT count(*)::int FROM updated) AS "updatedCount"
      FROM counts
    `);
    const [row] = result.rows;

    return (
      row.inputCount === row.userCount &&
      row.inputCount === row.distinctInputCount &&
      row.inputCount === row.ownedInputCount &&
      row.inputCount === row.updatedCount
    );
  });
