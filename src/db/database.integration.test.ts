import assert from 'node:assert/strict';
import test from 'node:test';

import { sql } from 'drizzle-orm';

import { tagSchema } from '../features/home/tag-schemas.ts';
import { createDataProtection } from '../lib/data-protection.ts';
import { createTestDatabase } from './test-database.ts';

interface TableCounts extends Record<string, unknown> {
  tagCount: number;
  taskTagCount: number;
  taskCount: number;
  userCount: number;
}

interface ContractColumnState extends Record<string, unknown> {
  correctCount: number;
  foundCount: number;
}

interface ContractIndexState extends Record<string, unknown> {
  definitionCount: number;
  foundCount: number;
  obsoleteCount: number;
}

interface ContractConstraintState extends Record<string, unknown> {
  definitionCount: number;
  foundCount: number;
}

interface MigrationState extends Record<string, unknown> {
  latestMigration: string;
  migrationCount: number;
}

interface PersistedTask extends Record<string, unknown> {
  id: string;
  titleCiphertext: string;
  titleLookup: string;
}

interface PersistedTag extends Record<string, unknown> {
  color: string;
  id: string;
  nameCiphertext: string;
  nameLookup: string;
}

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');

test('migrates and resets only the dedicated integration database', async () => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const migrationState = await testDatabase.db.execute<MigrationState>(sql`
    SELECT
      count(*)::int AS "migrationCount",
      max(created_at)::text AS "latestMigration"
    FROM drizzle.__drizzle_migrations
  `);

  assert.deepEqual(migrationState.rows[0], {
    latestMigration: '1785930212109',
    migrationCount: 11,
  });

  const columnState = await testDatabase.db.execute<ContractColumnState>(sql`
    WITH expected("tableName", "columnName", "isNullable") AS (
      VALUES
        ('session', 'ip_address_ciphertext', true),
        ('session', 'token_ciphertext', false),
        ('session', 'token_lookup', false),
        ('session', 'user_agent_ciphertext', true),
        ('tags', 'color', false),
        ('tags', 'id', false),
        ('tags', 'name_ciphertext', false),
        ('tags', 'name_lookup', false),
        ('tags', 'user_id', false),
        ('task_tags', 'tag_id', false),
        ('task_tags', 'task_id', false),
        ('task_tags', 'user_id', false),
        ('tasks', 'title_ciphertext', false),
        ('tasks', 'title_lookup', false),
        ('user', 'email_ciphertext', false),
        ('user', 'email_lookup', false),
        ('user', 'image_ciphertext', true),
        ('user', 'name_ciphertext', false),
        ('user', 'name_lookup', false),
        ('verification', 'identifier_ciphertext', false),
        ('verification', 'identifier_lookup', false),
        ('verification', 'purpose', false),
        ('verification', 'subject_user_id', true),
        ('verification', 'value_ciphertext', false)
    )
    SELECT
      count(columns.column_name)::int AS "foundCount",
      count(*) FILTER (
        WHERE (columns.is_nullable = 'YES') = expected."isNullable"
      )::int AS "correctCount"
    FROM expected
    LEFT JOIN information_schema.columns AS columns
      ON columns.table_schema = 'public'
      AND columns.table_name = expected."tableName"
      AND columns.column_name = expected."columnName"
  `);

  assert.deepEqual(columnState.rows[0], { correctCount: 24, foundCount: 24 });

  const obsoleteColumns = await testDatabase.db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS "count"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (table_name, column_name) IN (
        ('session', 'ip_address'),
        ('session', 'token'),
        ('session', 'user_agent'),
        ('tasks', 'title'),
        ('user', 'email'),
        ('user', 'image'),
        ('user', 'name'),
        ('verification', 'identifier'),
        ('verification', 'value')
      )
  `);

  assert.equal(obsoleteColumns.rows[0]?.count, 0);

  const indexState = await testDatabase.db.execute<ContractIndexState>(sql`
    WITH expected("indexName", "isUnique", "isPartial") AS (
      VALUES
        ('session_token_lookup_unique_idx', true, false),
        ('tags_user_id_id_unique_idx', true, false),
        ('tags_user_id_name_lookup_unique_idx', true, false),
        ('tasks_user_id_id_unique_idx', true, false),
        ('tasks_user_id_title_lookup_unique_idx', true, false),
        ('user_email_lookup_unique_idx', true, false),
        ('user_name_lookup_unique_idx', true, false),
        ('verification_identifier_lookup_idx', false, false),
        ('verification_purpose_subject_user_id_idx', false, true)
    )
    SELECT
      count(indexes.indexname) FILTER (
        WHERE
          (indexes.indexdef LIKE 'CREATE UNIQUE INDEX%') = expected."isUnique"
          AND (position(' WHERE ' IN indexes.indexdef) > 0) = expected."isPartial"
      )::int AS "definitionCount",
      count(indexes.indexname)::int AS "foundCount",
      (
        SELECT count(*)::int
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'session_token_unique',
            'tasks_user_id_title_unique_idx',
            'user_email_unique',
            'user_name_unique',
            'verification_identifier_idx'
          )
      ) AS "obsoleteCount"
    FROM expected
    LEFT JOIN pg_indexes AS indexes
      ON indexes.schemaname = 'public'
      AND indexes.indexname = expected."indexName"
  `);

  assert.deepEqual(indexState.rows[0], { definitionCount: 9, foundCount: 9, obsoleteCount: 0 });

  const constraintState = await testDatabase.db.execute<ContractConstraintState>(sql`
    WITH expected("constraintName", "definition") AS (
      VALUES
        (
          'task_tags_user_id_task_id_tag_id_pk',
          'PRIMARY KEY (user_id, task_id, tag_id)'
        ),
        (
          'task_tags_user_task_fk',
          'FOREIGN KEY (user_id, task_id) REFERENCES tasks(user_id, id) ON DELETE CASCADE'
        ),
        (
          'task_tags_user_tag_fk',
          'FOREIGN KEY (user_id, tag_id) REFERENCES tags(user_id, id) ON DELETE CASCADE'
        )
    )
    SELECT
      count(constraints.oid) FILTER (
        WHERE position(expected."definition" IN pg_get_constraintdef(constraints.oid)) > 0
      )::int AS "definitionCount",
      count(constraints.oid)::int AS "foundCount"
    FROM expected
    LEFT JOIN pg_constraint AS constraints
      ON constraints.conname = expected."constraintName"
      AND constraints.conrelid = 'public.task_tags'::regclass
  `);

  assert.deepEqual(constraintState.rows[0], { definitionCount: 3, foundCount: 3 });

  const userId = crypto.randomUUID();

  await testDatabase.db.execute(sql`
    INSERT INTO "user" (
      "id",
      "email_ciphertext",
      "email_lookup",
      "name_ciphertext",
      "name_lookup"
    )
    VALUES (
      ${userId},
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
      ${userId},
      'enc:v1:1:title',
      'title-lookup',
      now(),
      0
    )
  `);

  await testDatabase.reset();

  const result = await testDatabase.db.execute<TableCounts>(sql`
    SELECT
      (SELECT count(*)::int FROM "tags") AS "tagCount",
      (SELECT count(*)::int FROM "task_tags") AS "taskTagCount",
      (SELECT count(*)::int FROM "tasks") AS "taskCount",
      (SELECT count(*)::int FROM "user") AS "userCount"
  `);

  assert.deepEqual(result.rows[0], { tagCount: 0, taskCount: 0, taskTagCount: 0, userCount: 0 });
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

  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: process.env.BLIND_INDEX_KEYS,
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: process.env.DATA_ENCRYPTION_KEYS,
  });

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
  const orphanTitle = 'Encrypted Orphan';
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  await testDatabase.db.execute(sql`
    INSERT INTO "user" (
      "id", "email_ciphertext", "email_lookup", "name_ciphertext", "name_lookup"
    )
    VALUES (
      ${userId},
      'enc:v1:1:email',
      ${`email-${userId}`},
      'enc:v1:1:name',
      ${`name-${userId}`}
    )
  `);

  await assert.rejects(createTask(crypto.randomUUID(), orphanTitle), (error: unknown) => {
    assert.ok(error instanceof TaskQueryError);
    assert.equal(error.code, 'OPERATION_FAILED');

    return true;
  });

  const alphaId = crypto.randomUUID();

  await testDatabase.db.execute(sql`
    INSERT INTO "tasks" (
      "id", "user_id", "title_ciphertext", "title_lookup", "changed_on", "position"
    )
    VALUES (
      ${alphaId},
      ${userId},
      ${dataProtection.encryptValue(alphaTitle, {
        field: 'title',
        model: 'tasks',
        recordId: alphaId,
      })},
      ${dataProtection.taskTitleLookup(userId, alphaTitle)},
      now(),
      0
    )
  `);

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
      "title_ciphertext" AS "titleCiphertext",
      "title_lookup" AS "titleLookup"
    FROM "tasks"
    WHERE "user_id" = ${userId}
  `);

  assert.equal(persisted.rows.length, 1);
  assert.equal(persisted.rows[0]?.id, alphaId);
  assert.match(persisted.rows[0]?.titleCiphertext ?? '', /^enc:v1:1:/u);
  assert.ok(persisted.rows[0]?.titleLookup);

  const capturedOutput = stderr.join('');

  assert.match(capturedOutput, /"category":"DUPLICATE_TITLE"/u);

  for (const title of [alphaTitle, betaTitle, gammaTitle, orphanTitle]) {
    assert.equal(capturedOutput.includes(title), false);
  }

  await testDatabase.reset();
});

test('persists and manages encrypted tags through the guarded database', async (context) => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATA_ENCRYPTION_KEYS = JSON.stringify({ 1: key(1) });
  process.env.DATA_ENCRYPTION_ACTIVE_VERSION = '1';
  process.env.BLIND_INDEX_KEYS = JSON.stringify({ 1: key(2) });
  process.env.BLIND_INDEX_ACTIVE_VERSION = '1';

  const { createTag, deleteTag, listTags, TagQueryError, updateTag } =
    await import('./tag-queries.ts');
  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: process.env.BLIND_INDEX_KEYS,
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: process.env.DATA_ENCRYPTION_KEYS,
  });
  const userId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  await Promise.all(
    [userId, otherUserId].map((id) =>
      testDatabase.db.execute(sql`
        INSERT INTO "user" (
          "id", "email_ciphertext", "email_lookup", "name_ciphertext", "name_lookup"
        )
        VALUES (
          ${id},
          'enc:v1:1:email',
          ${`email-${id}`},
          'enc:v1:1:name',
          ${`name-${id}`}
        )
      `),
    ),
  );

  await assert.rejects(
    createTag(crypto.randomUUID(), { color: '#000000', name: 'orphan' }),
    (error: unknown) => {
      assert.ok(error instanceof TagQueryError);
      assert.equal(error.code, 'OPERATION_FAILED');

      return true;
    },
  );

  const workInput = tagSchema.parse({ color: '#AA0000', name: ' Work ' });
  const work = await createTag(userId, workInput);
  const duplicate = await createTag(userId, tagSchema.parse({ color: '#00FF00', name: 'WORK' }));

  assert.deepEqual(duplicate, work);
  assert.deepEqual(work, { color: '#aa0000', id: work.id, name: 'work' });

  const zeta = await createTag(userId, { color: '#0000ff', name: 'zeta' });
  const alpha = await createTag(userId, { color: '#00ff00', name: 'alpha' });

  const createdTags = await listTags(userId);

  assert.deepEqual(
    createdTags.map(({ name }) => name),
    ['alpha', 'work', 'zeta'],
  );

  const persisted = await testDatabase.db.execute<PersistedTag>(sql`
    SELECT
      "color",
      "id",
      "name_ciphertext" AS "nameCiphertext",
      "name_lookup" AS "nameLookup"
    FROM "tags"
    WHERE "id" = ${work.id}
  `);

  assert.equal(persisted.rows[0]?.color, '#aa0000');
  assert.equal(persisted.rows[0]?.id, work.id);
  assert.match(persisted.rows[0]?.nameCiphertext ?? '', /^enc:v1:1:/u);
  assert.notEqual(persisted.rows[0]?.nameCiphertext, 'work');
  assert.equal(persisted.rows[0]?.nameLookup, dataProtection.tagNameLookup(userId, 'work'));

  await assert.rejects(
    updateTag(userId, work.id, { color: '#ffffff', name: alpha.name }),
    (error: unknown) => {
      assert.ok(error instanceof TagQueryError);
      assert.equal(error.code, 'DUPLICATE_TAG');

      return true;
    },
  );
  assert.equal(await updateTag(otherUserId, work.id, { color: '#ffffff', name: 'office' }), false);
  assert.equal(await deleteTag(otherUserId, work.id), false);
  assert.equal(await updateTag(userId, work.id, { color: '#ffffff', name: 'office' }), true);

  const taskId = crypto.randomUUID();
  const taskTitle = 'Tagged task';

  await testDatabase.db.execute(sql`
    INSERT INTO "tasks" (
      "id", "user_id", "title_ciphertext", "title_lookup", "changed_on", "position"
    )
    VALUES (
      ${taskId},
      ${userId},
      ${dataProtection.encryptValue(taskTitle, {
        field: 'title',
        model: 'tasks',
        recordId: taskId,
      })},
      ${dataProtection.taskTitleLookup(userId, taskTitle)},
      now(),
      0
    )
  `);
  await testDatabase.db.execute(sql`
    INSERT INTO "task_tags" ("user_id", "task_id", "tag_id")
    VALUES (${userId}, ${taskId}, ${work.id})
  `);

  assert.equal(await deleteTag(userId, work.id), true);

  const retainedTask = await testDatabase.db.execute<{
    assignmentCount: number;
    taskCount: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM "task_tags" WHERE "task_id" = ${taskId}) AS "assignmentCount",
      (SELECT count(*)::int FROM "tasks" WHERE "id" = ${taskId}) AS "taskCount"
  `);

  assert.deepEqual(retainedTask.rows[0], { assignmentCount: 0, taskCount: 1 });

  const remainingTags = await listTags(userId);

  assert.deepEqual(
    remainingTags.map(({ id }) => id),
    [alpha.id, zeta.id],
  );

  const capturedOutput = stderr.join('');

  assert.match(capturedOutput, /"category":"DUPLICATE_TAG"/u);

  for (const value of ['alpha', 'office', 'orphan', 'work', 'zeta']) {
    assert.equal(capturedOutput.includes(value), false);
  }

  await testDatabase.reset();
});
