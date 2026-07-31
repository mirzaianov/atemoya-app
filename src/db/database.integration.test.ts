import assert from 'node:assert/strict';
import test from 'node:test';

import { sql } from 'drizzle-orm';

import { createTestDatabase } from './test-database.ts';

interface TableCounts extends Record<string, unknown> {
  taskCount: number;
  userCount: number;
}

test('migrates and resets only the dedicated integration database', async () => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const userId = crypto.randomUUID();

  await testDatabase.db.execute(sql`
    INSERT INTO "user" ("id", "email", "name")
    VALUES (${userId}, ${`${userId}@example.test`}, ${`test_${userId}`})
  `);
  await testDatabase.db.execute(sql`
    INSERT INTO "tasks" (
      "id",
      "user_id",
      "title",
      "changed_on",
      "position"
    )
    VALUES (${crypto.randomUUID()}, ${userId}, 'integration marker', now(), 0)
  `);

  await testDatabase.reset();

  const result = await testDatabase.db.execute<TableCounts>(sql`
    SELECT
      (SELECT count(*)::int FROM "tasks") AS "taskCount",
      (SELECT count(*)::int FROM "user") AS "userCount"
  `);

  assert.deepEqual(result.rows[0], { taskCount: 0, userCount: 0 });
});
