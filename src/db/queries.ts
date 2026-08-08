import { and, desc, eq, ne, sql } from 'drizzle-orm';

import { DataProtectionError } from '../lib/data-protection.ts';
import { getDataProtection } from '../lib/data-protection-config.ts';
import { logSecurityEvent } from '../lib/security-logger.ts';
import type { Tag } from '../types.ts';
import { db } from './client.ts';
import { tags, tasks, taskTags } from './schema.ts';

export interface TaskRecord {
  changedOn: Date;
  completedAt: Date | null;
  id: string;
  position: number;
  tags: Tag[];
  title: string;
}

export type TaskQueryErrorCode =
  | 'DATA_UNAVAILABLE'
  | 'DUPLICATE_TITLE'
  | 'INVALID_TAGS'
  | 'OPERATION_FAILED';

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

const readTasks = (userId: string, id?: string): Promise<TaskRecord[]> =>
  runTaskQuery('list', async () => {
    const taskCondition = id
      ? and(eq(tasks.userId, userId), eq(tasks.id, id))
      : eq(tasks.userId, userId);
    const assignmentCondition = id
      ? and(eq(taskTags.userId, userId), eq(taskTags.taskId, id))
      : eq(taskTags.userId, userId);
    const [records, assignments] = await Promise.all([
      db
        .select({
          changedOn: tasks.changedOn,
          completedAt: tasks.completedAt,
          id: tasks.id,
          position: tasks.position,
          titleCiphertext: tasks.title,
        })
        .from(tasks)
        .where(taskCondition)
        .orderBy(
          sql`${tasks.completedAt} IS NOT NULL`,
          sql`CASE WHEN ${tasks.completedAt} IS NULL THEN ${tasks.position} END`,
          desc(tasks.completedAt),
          desc(tasks.changedOn),
        ),
      db
        .select({
          color: tags.color,
          nameCiphertext: tags.name,
          tagId: tags.id,
          taskId: taskTags.taskId,
        })
        .from(taskTags)
        .innerJoin(tags, and(eq(taskTags.userId, tags.userId), eq(taskTags.tagId, tags.id)))
        .where(assignmentCondition),
    ]);
    const tagsById = new Map<string, Tag>();
    const tagsByTaskId = new Map<string, Tag[]>();

    for (const assignment of assignments) {
      let tag = tagsById.get(assignment.tagId);

      if (!tag) {
        tag = {
          color: assignment.color,
          id: assignment.tagId,
          name: dataProtection.decryptValue(assignment.nameCiphertext, {
            field: 'name',
            model: 'tags',
            recordId: assignment.tagId,
          }),
        };
        tagsById.set(tag.id, tag);
      }

      const assignedTags = tagsByTaskId.get(assignment.taskId) ?? [];

      assignedTags.push(tag);
      tagsByTaskId.set(assignment.taskId, assignedTags);
    }

    return records.map(({ titleCiphertext, ...record }) => {
      const assignedTags = tagsByTaskId.get(record.id) ?? [];

      // oxlint-disable-next-line unicorn/no-array-sort -- The project targets ES2022, before Array#toSorted.
      assignedTags.sort((left, right) => left.name.localeCompare(right.name));

      return {
        ...record,
        tags: assignedTags,
        title: dataProtection.decryptValue(titleCiphertext, {
          field: 'title',
          model: 'tasks',
          recordId: record.id,
        }),
      };
    });
  });

export const listTasks = (userId: string) => readTasks(userId);

export const getTask = async (userId: string, id: string) => {
  const records = await readTasks(userId, id);

  return records[0] ?? null;
};

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

interface CreateTaskRow extends Record<string, unknown> {
  assignmentCount: number;
  insertedCount: number;
}

interface UpdateTaskRow extends Record<string, unknown> {
  inputValid: boolean;
  targetCount: number;
  updatedCount: number;
}

export const createTask = (userId: string, title: string, tagIds: string[]) => {
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
      const serializedTagIds = JSON.stringify(tagIds);

      const result = await db.execute<CreateTaskRow>(sql`
        WITH requested_tags("id") AS (
          SELECT value
          FROM jsonb_array_elements_text(${serializedTagIds}::jsonb)
        ),
        counts AS (
          SELECT
            count(*)::int AS "inputCount",
            count(DISTINCT "id")::int AS "distinctCount",
            (
              SELECT count(*)::int
              FROM ${tags}
              INNER JOIN (SELECT DISTINCT "id" FROM requested_tags) AS requested
                ON ${tags.id} = requested.id
              WHERE ${tags.userId} = ${userId}
            ) AS "ownedCount"
          FROM requested_tags
        ),
        validated AS (
          SELECT 1
          FROM counts
          WHERE "inputCount" <= 10
            AND "inputCount" = "distinctCount"
            AND "distinctCount" = "ownedCount"
        ),
        shifted AS (
          UPDATE ${tasks}
          SET ${sql.identifier('position')} = ${tasks.position} + 1
          WHERE ${tasks.userId} = ${userId}
            AND ${tasks.completedAt} IS NULL
            AND EXISTS (SELECT 1 FROM validated)
        ),
        inserted_task AS (
          INSERT INTO ${tasks} (
            ${sql.identifier('id')},
            ${sql.identifier('user_id')},
            ${sql.identifier('title_ciphertext')},
            ${sql.identifier('title_lookup')},
            ${sql.identifier('changed_on')},
            ${sql.identifier('position')}
          )
          SELECT ${id}, ${userId}, ${titleCiphertext}, ${titleLookup}, now(), 0
          FROM validated
          RETURNING ${tasks.id}
        ),
        inserted_assignments AS (
          INSERT INTO ${taskTags} (
            ${sql.identifier('user_id')},
            ${sql.identifier('task_id')},
            ${sql.identifier('tag_id')}
          )
          SELECT ${userId}, inserted_task.id, requested_tags.id
          FROM inserted_task
          CROSS JOIN requested_tags
          RETURNING ${taskTags.tagId}
        )
        SELECT
          (SELECT count(*)::int FROM inserted_task) AS "insertedCount",
          (SELECT count(*)::int FROM inserted_assignments) AS "assignmentCount"
      `);
      const [row] = result.rows;

      if (row?.insertedCount !== 1 || row.assignmentCount !== tagIds.length) {
        throw new TaskQueryError('INVALID_TAGS');
      }

      return id;
    },
    id,
  );
};

export const updateTask = (userId: string, id: string, title: string, tagIds: string[]) =>
  runTaskQuery(
    'update',
    async () => {
      const titleCiphertext = dataProtection.encryptValue(title, {
        field: 'title',
        model: 'tasks',
        recordId: id,
      });
      const titleLookup = dataProtection.taskTitleLookup(userId, title);
      const serializedTagIds = JSON.stringify(tagIds);
      const result = await db.execute<UpdateTaskRow>(sql`
        WITH requested_tags("id") AS (
          SELECT value
          FROM jsonb_array_elements_text(${serializedTagIds}::jsonb)
        ),
        counts AS (
          SELECT
            count(*)::int AS "inputCount",
            count(DISTINCT "id")::int AS "distinctCount",
            (
              SELECT count(*)::int
              FROM ${tags}
              INNER JOIN (SELECT DISTINCT "id" FROM requested_tags) AS requested
                ON ${tags.id} = requested.id
              WHERE ${tags.userId} = ${userId}
            ) AS "ownedCount"
          FROM requested_tags
        ),
        target AS (
          SELECT ${tasks.id}
          FROM ${tasks}
          WHERE ${tasks.userId} = ${userId}
            AND ${tasks.id} = ${id}
        ),
        validated AS (
          SELECT target.id
          FROM target
          CROSS JOIN counts
          WHERE "inputCount" <= 10
            AND "inputCount" = "distinctCount"
            AND "distinctCount" = "ownedCount"
        ),
        updated_task AS (
          UPDATE ${tasks}
          SET
            ${sql.identifier('changed_on')} = now(),
            ${sql.identifier('title_ciphertext')} = ${titleCiphertext},
            ${sql.identifier('title_lookup')} = ${titleLookup}
          FROM validated
          WHERE ${tasks.userId} = ${userId}
            AND ${tasks.id} = validated.id
          RETURNING ${tasks.id}
        ),
        deleted_assignments AS (
          DELETE FROM ${taskTags}
          USING updated_task
          WHERE ${taskTags.userId} = ${userId}
            AND ${taskTags.taskId} = updated_task.id
            AND NOT EXISTS (
              SELECT 1
              FROM requested_tags
              WHERE requested_tags.id = ${taskTags.tagId}
            )
          RETURNING ${taskTags.tagId}
        ),
        inserted_assignments AS (
          INSERT INTO ${taskTags} (
            ${sql.identifier('user_id')},
            ${sql.identifier('task_id')},
            ${sql.identifier('tag_id')}
          )
          SELECT ${userId}, updated_task.id, requested_tags.id
          FROM updated_task
          CROSS JOIN requested_tags
          ON CONFLICT DO NOTHING
          RETURNING ${taskTags.tagId}
        )
        SELECT
          EXISTS (
            SELECT 1
            FROM counts
            WHERE "inputCount" <= 10
              AND "inputCount" = "distinctCount"
              AND "distinctCount" = "ownedCount"
          ) AS "inputValid",
          (SELECT count(*)::int FROM target) AS "targetCount",
          (SELECT count(*)::int FROM updated_task) AS "updatedCount"
      `);
      const [row] = result.rows;

      if (row?.targetCount === 0) {
        return false;
      }

      if (!row?.inputValid || row.updatedCount !== 1) {
        throw new TaskQueryError('INVALID_TAGS');
      }

      return true;
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
