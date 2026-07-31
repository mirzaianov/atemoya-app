import assert from 'node:assert/strict';
import test from 'node:test';

import { sql } from 'drizzle-orm';

import { createTestDatabase } from './test-database.ts';

interface TableCounts extends Record<string, unknown> {
  taskCount: number;
  userCount: number;
}

interface AdditiveColumnState extends Record<string, unknown> {
  foundCount: number;
  nullableCount: number;
}

interface AdditiveIndexState extends Record<string, unknown> {
  definitionCount: number;
  foundCount: number;
}

interface PersistedTask extends Record<string, unknown> {
  id: string;
  title: string | null;
  titleCiphertext: string | null;
  titleLookup: string | null;
}

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');

test('migrates and resets only the dedicated integration database', async () => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const columnState = await testDatabase.db.execute<AdditiveColumnState>(sql`
    WITH expected("tableName", "columnName") AS (
      VALUES
        ('session', 'ip_address_ciphertext'),
        ('session', 'token'),
        ('session', 'token_ciphertext'),
        ('session', 'token_lookup'),
        ('session', 'user_agent_ciphertext'),
        ('tasks', 'title'),
        ('tasks', 'title_ciphertext'),
        ('tasks', 'title_lookup'),
        ('user', 'email'),
        ('user', 'email_ciphertext'),
        ('user', 'email_lookup'),
        ('user', 'image_ciphertext'),
        ('user', 'name'),
        ('user', 'name_ciphertext'),
        ('user', 'name_lookup'),
        ('verification', 'identifier'),
        ('verification', 'identifier_ciphertext'),
        ('verification', 'identifier_lookup'),
        ('verification', 'purpose'),
        ('verification', 'subject_user_id'),
        ('verification', 'value'),
        ('verification', 'value_ciphertext')
    )
    SELECT
      count(columns.column_name)::int AS "foundCount",
      count(*) FILTER (WHERE columns.is_nullable = 'YES')::int AS "nullableCount"
    FROM expected
    LEFT JOIN information_schema.columns AS columns
      ON columns.table_schema = 'public'
      AND columns.table_name = expected."tableName"
      AND columns.column_name = expected."columnName"
  `);

  assert.deepEqual(columnState.rows[0], { foundCount: 22, nullableCount: 22 });

  const indexState = await testDatabase.db.execute<AdditiveIndexState>(sql`
    WITH expected("indexName", "isUnique", "isPartial") AS (
      VALUES
        ('session_token_unique', true, false),
        ('session_token_lookup_unique_idx', true, true),
        ('tasks_user_id_title_unique_idx', true, false),
        ('tasks_user_id_title_lookup_unique_idx', true, true),
        ('user_email_unique', true, false),
        ('user_email_lookup_unique_idx', true, true),
        ('user_name_unique', true, false),
        ('user_name_lookup_unique_idx', true, true),
        ('verification_identifier_lookup_idx', false, true),
        ('verification_purpose_subject_user_id_idx', false, true)
    )
    SELECT
      count(indexes.indexname) FILTER (
        WHERE
          (indexes.indexdef LIKE 'CREATE UNIQUE INDEX%') = expected."isUnique"
          AND (position(' WHERE ' IN indexes.indexdef) > 0) = expected."isPartial"
      )::int AS "definitionCount",
      count(indexes.indexname)::int AS "foundCount"
    FROM expected
    LEFT JOIN pg_indexes AS indexes
      ON indexes.schemaname = 'public'
      AND indexes.indexname = expected."indexName"
  `);

  assert.deepEqual(indexState.rows[0], { definitionCount: 10, foundCount: 10 });

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

  const shadowUserId = crypto.randomUUID();

  await testDatabase.db.execute(sql`
    INSERT INTO "user" (
      "id",
      "email_ciphertext",
      "email_lookup",
      "name_ciphertext",
      "name_lookup"
    )
    VALUES (
      ${shadowUserId},
      'enc:v1:1:email',
      'email-lookup',
      'enc:v1:1:name',
      'name-lookup'
    )
  `);
  await testDatabase.db.execute(sql`
    INSERT INTO "tasks" (
      "id",
      "user_id",
      "title_ciphertext",
      "title_lookup",
      "changed_on",
      "position"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${shadowUserId},
      'enc:v1:1:title',
      'title-lookup',
      now(),
      0
    )
  `);

  await testDatabase.reset();

  const result = await testDatabase.db.execute<TableCounts>(sql`
    SELECT
      (SELECT count(*)::int FROM "tasks") AS "taskCount",
      (SELECT count(*)::int FROM "user") AS "userCount"
  `);

  assert.deepEqual(result.rows[0], { taskCount: 0, userCount: 0 });
});

test('persists and reads encrypted task titles through the guarded database', async (context) => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATA_ENCRYPTION_KEYS = JSON.stringify({ 1: key(1) });
  process.env.DATA_ENCRYPTION_ACTIVE_VERSION = '1';
  process.env.BLIND_INDEX_KEYS = JSON.stringify({ 1: key(2) });
  process.env.BLIND_INDEX_ACTIVE_VERSION = '1';

  const {
    createTask,
    deleteTask,
    listTasks,
    reorderTasks,
    setTaskCompleted,
    TaskQueryError,
    taskTitleExists,
    updateTask,
  } = await import('./queries.ts');
  const userId = crypto.randomUUID();
  const alphaTitle = 'Encrypted Alpha';
  const betaTitle = 'Encrypted Beta';
  const gammaTitle = 'Encrypted Gamma';
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  await testDatabase.db.execute(sql`
    INSERT INTO "user" ("id", "email", "name")
    VALUES (${userId}, ${`${userId}@example.test`}, ${`test_${userId}`})
  `);

  const alphaId = await createTask(userId, alphaTitle);
  const betaId = await createTask(userId, betaTitle);
  const createdTasks = await listTasks(userId);

  assert.deepEqual(
    createdTasks.map(({ id, position, title }) => ({ id, position, title })),
    [
      { id: betaId, position: 0, title: betaTitle },
      { id: alphaId, position: 1, title: alphaTitle },
    ],
  );
  assert.equal(await taskTitleExists(userId, ` ${alphaTitle.toUpperCase()} `), true);
  await assert.rejects(createTask(userId, alphaTitle.toLowerCase()), (error: unknown) => {
    assert.ok(error instanceof TaskQueryError);
    assert.equal(error.code, 'DUPLICATE_TITLE');

    return true;
  });

  assert.equal(await updateTask(userId, betaId, gammaTitle), true);
  assert.equal(await taskTitleExists(userId, gammaTitle, betaId), false);
  assert.equal(await taskTitleExists(userId, gammaTitle), true);
  await assert.rejects(updateTask(userId, betaId, alphaTitle), (error: unknown) => {
    assert.ok(error instanceof TaskQueryError);
    assert.equal(error.code, 'DUPLICATE_TITLE');

    return true;
  });

  assert.equal(await setTaskCompleted(userId, alphaId, true), true);

  const completedTasks = await listTasks(userId);

  assert.deepEqual(
    completedTasks.map(({ id, title }) => ({ id, title })),
    [
      { id: betaId, title: gammaTitle },
      { id: alphaId, title: alphaTitle },
    ],
  );
  assert.notEqual(completedTasks[1]?.completedAt, null);

  assert.equal(await setTaskCompleted(userId, alphaId, false), true);
  assert.equal(await reorderTasks(userId, [betaId, alphaId]), true);

  const reorderedTasks = await listTasks(userId);

  assert.deepEqual(
    reorderedTasks.map(({ id, position }) => ({ id, position })),
    [
      { id: betaId, position: 0 },
      { id: alphaId, position: 1 },
    ],
  );
  assert.equal(await deleteTask(userId, betaId), true);

  const remainingTasks = await listTasks(userId);

  assert.deepEqual(
    remainingTasks.map(({ id, title }) => ({ id, title })),
    [{ id: alphaId, title: alphaTitle }],
  );

  const persisted = await testDatabase.db.execute<PersistedTask>(sql`
    SELECT
      "id",
      "title",
      "title_ciphertext" AS "titleCiphertext",
      "title_lookup" AS "titleLookup"
    FROM "tasks"
    WHERE "user_id" = ${userId}
  `);

  assert.equal(persisted.rows.length, 1);
  assert.equal(persisted.rows[0]?.id, alphaId);
  assert.equal(persisted.rows[0]?.title, null);
  assert.match(persisted.rows[0]?.titleCiphertext ?? '', /^enc:v1:1:/u);
  assert.ok(persisted.rows[0]?.titleLookup);

  const capturedOutput = stderr.join('');

  assert.match(capturedOutput, /"category":"DUPLICATE_TITLE"/u);

  for (const title of [alphaTitle, betaTitle, gammaTitle]) {
    assert.equal(capturedOutput.includes(title), false);
  }

  await testDatabase.reset();
});
