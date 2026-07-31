import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from './client';
import { tasks } from './schema';

export type TaskRecord = Omit<typeof tasks.$inferSelect, 'title'> & { title: string };

export const listTasks = async (userId: string): Promise<TaskRecord[]> => {
  const records = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(
      sql`${tasks.completedAt} IS NOT NULL`,
      sql`CASE WHEN ${tasks.completedAt} IS NULL THEN ${tasks.position} END`,
      desc(tasks.completedAt),
      desc(tasks.changedOn),
    );

  return records.map((record) => {
    if (record.title === null) {
      throw new Error('TASK_DATA_UNAVAILABLE');
    }

    return { ...record, title: record.title };
  });
};

export const createTask = async (userId: string, title: string) => {
  const id = crypto.randomUUID();

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
      ${sql.identifier('title')},
      ${sql.identifier('changed_on')},
      ${sql.identifier('position')}
    )
    VALUES (${id}, ${userId}, ${title}, now(), 0)
  `);
};

export const updateTask = async (userId: string, id: string, title: string) => {
  const [task] = await db
    .update(tasks)
    .set({ changedOn: sql`now()`, title })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();

  return task ?? null;
};

export const deleteTask = async (userId: string, id: string) => {
  const [task] = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning({ id: tasks.id });

  return Boolean(task);
};

interface TaskCompletionRow extends Record<string, unknown> {
  updatedCount: number;
}

export const setTaskCompleted = async (userId: string, id: string, completed: boolean) => {
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
};

interface ReorderTasksRow extends Record<string, unknown> {
  inputCount: number;
  userCount: number;
  distinctInputCount: number;
  ownedInputCount: number;
  updatedCount: number;
}

export const reorderTasks = async (userId: string, ids: string[]) => {
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
};
