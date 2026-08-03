import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../../drizzle/0009_contract_encrypted_columns.sql', import.meta.url);

test('contracts protected columns only after enforcing ciphertext', async () => {
  const migration = await readFile(migrationPath, 'utf-8');
  const requiredColumns = [
    'session" ALTER COLUMN "token_ciphertext',
    'session" ALTER COLUMN "token_lookup',
    'tasks" ALTER COLUMN "title_ciphertext',
    'tasks" ALTER COLUMN "title_lookup',
    'user" ALTER COLUMN "email_ciphertext',
    'user" ALTER COLUMN "email_lookup',
    'user" ALTER COLUMN "name_ciphertext',
    'user" ALTER COLUMN "name_lookup',
    'verification" ALTER COLUMN "identifier_ciphertext',
    'verification" ALTER COLUMN "identifier_lookup',
    'verification" ALTER COLUMN "purpose',
    'verification" ALTER COLUMN "value_ciphertext',
  ];
  const plaintextColumns = [
    ['session', 'ip_address'],
    ['session', 'token'],
    ['session', 'user_agent'],
    ['tasks', 'title'],
    ['user', 'email'],
    ['user', 'image'],
    ['user', 'name'],
    ['verification', 'identifier'],
    ['verification', 'value'],
  ] as const;

  for (const column of requiredColumns) {
    assert.match(migration, new RegExp(`ALTER TABLE "${column}" SET NOT NULL`, 'u'));
  }

  for (const [table, column] of plaintextColumns) {
    const drop = `ALTER TABLE "${table}" DROP COLUMN "${column}"`;

    assert.ok(migration.includes(drop));
    assert.ok(migration.indexOf('SET NOT NULL') < migration.indexOf(drop));
  }

  assert.doesNotMatch(
    migration,
    /CREATE (?:UNIQUE )?INDEX "(?:session_token|tasks_user_id_title|user_(?:email|name)|verification_identifier)_lookup[^;]+ WHERE /u,
  );
});
