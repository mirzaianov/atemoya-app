import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { promisify } from 'node:util';

import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { sql } from 'drizzle-orm';

import { createDataProtection } from '../lib/data-protection.ts';
import {
  DataConversionError,
  runConversionPreflight,
  runDataConversion,
} from './data-conversion.ts';
import { createTestDatabase } from './test-database.ts';

interface PersistedState extends Record<string, unknown> {
  backupCodes: string;
  emailCiphertext: string | null;
  identifierCiphertext: string | null;
  ipAddressCiphertext: string | null;
  nameCiphertext: string | null;
  title: string;
  titleCiphertext: string | null;
  tokenCiphertext: string | null;
  valueCiphertext: string | null;
}

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');
const execFileAsync = promisify(execFile);

test('preflights and converts pending state through atomic batches', async (context) => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: JSON.stringify({ 1: key(8) }),
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: JSON.stringify({ 1: key(7) }),
  });
  const betterAuthSecret = 'conversion-better-auth-secret-marker';
  const userId = 'conversion-user';
  const sessionId = 'conversion-session';
  const taskId = 'conversion-task';
  const verificationId = 'conversion-verification';
  const twoFactorId = 'conversion-two-factor';
  const email = 'Conversion@Example.test';
  const nickname = 'conversion_user';
  const image = 'https://example.test/conversion-avatar.png';
  const token = 'conversion-session-token-marker';
  const ipAddress = '203.0.113.88';
  const userAgent = 'conversion-user-agent-marker';
  const title = 'Conversion task marker';
  const identifier = 'trust-device-conversion-marker';
  const value = userId;
  const backupCodes = ['conversion-code-one', 'conversion-code-two'];
  const serializedBackupCodes = JSON.stringify(backupCodes);
  const encryptedTotpSecret = await symmetricEncrypt({
    data: 'conversion-totp-secret-marker',
    key: betterAuthSecret,
  });
  const now = new Date();
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  try {
    await testDatabase.db.execute(sql`
      INSERT INTO "user" (
        "id", "name", "email", "email_verified", "image",
        "created_at", "updated_at", "two_factor_enabled"
      )
      VALUES (${userId}, ${nickname}, ${email}, true, ${image}, ${now}, ${now}, true)
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "account" (
        "id", "account_id", "provider_id", "user_id", "password",
        "created_at", "updated_at"
      )
      VALUES (
        'conversion-account', ${userId}, 'credential', ${userId},
        'better-auth-owned-password-hash', ${now}, ${now}
      )
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "session" (
        "id", "token", "user_id", "expires_at", "ip_address", "user_agent",
        "created_at", "updated_at"
      )
      VALUES (
        ${sessionId}, ${token}, ${userId}, ${new Date(now.getTime() + 60_000)},
        ${ipAddress}, ${userAgent}, ${now}, ${now}
      )
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "tasks" (
        "id", "user_id", "title", "changed_on", "position"
      )
      VALUES (${taskId}, ${userId}, ${title}, ${now}, 0)
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "verification" (
        "id", "identifier", "value", "expires_at", "created_at", "updated_at"
      )
      VALUES (
        ${verificationId}, ${identifier}, ${value},
        ${new Date(now.getTime() + 60_000)}, ${now}, ${now}
      )
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "two_factor" (
        "id", "secret", "backup_codes", "user_id", "verified",
        "failed_verification_count"
      )
      VALUES (
        ${twoFactorId}, ${encryptedTotpSecret}, ${serializedBackupCodes}, ${userId}, true, 0
      )
    `);

    const options = {
      batchSize: 1,
      betterAuthSecret,
      confirmation: 'CONVERT-ATEMOYA-TEST',
      dataProtection,
      db: testDatabase.db,
      target: 'test',
    } as const;
    const counts = await runConversionPreflight(options);

    assert.deepEqual(counts, {
      accounts: 1,
      sessions: 1,
      tasks: 1,
      twoFactors: 1,
      users: 1,
      verifications: 1,
    });

    const readState = async () => {
      const result = await testDatabase.db.execute<PersistedState>(sql`
        SELECT
          two_factor."backup_codes" AS "backupCodes",
          users."email_ciphertext" AS "emailCiphertext",
          users."name_ciphertext" AS "nameCiphertext",
          sessions."ip_address_ciphertext" AS "ipAddressCiphertext",
          sessions."token_ciphertext" AS "tokenCiphertext",
          tasks."title",
          tasks."title_ciphertext" AS "titleCiphertext",
          verifications."identifier_ciphertext" AS "identifierCiphertext",
          verifications."value_ciphertext" AS "valueCiphertext"
        FROM "user" AS users
        INNER JOIN "session" AS sessions ON sessions."id" = ${sessionId}
        INNER JOIN "tasks" AS tasks ON tasks."id" = ${taskId}
        INNER JOIN "verification" AS verifications ON verifications."id" = ${verificationId}
        INNER JOIN "two_factor" AS two_factor ON two_factor."id" = ${twoFactorId}
        WHERE users."id" = ${userId}
      `);
      const [state] = result.rows;

      assert.ok(state);

      return state;
    };
    const pendingState = await readState();

    assert.deepEqual(pendingState, {
      backupCodes: serializedBackupCodes,
      emailCiphertext: null,
      identifierCiphertext: null,
      ipAddressCiphertext: null,
      nameCiphertext: null,
      title,
      titleCiphertext: null,
      tokenCiphertext: null,
      valueCiphertext: null,
    });

    const concurrentName = 'concurrent_conversion_user';
    let sourceChanged = false;

    await assert.rejects(
      runDataConversion({
        ...options,
        testHooks: {
          beforeBatchCommit: async () => {
            if (sourceChanged) {
              return;
            }

            sourceChanged = true;
            await testDatabase.db.execute(sql`
              UPDATE "user"
              SET "name" = ${concurrentName}
              WHERE "id" = ${userId}
            `);
          },
        },
      }),
      DataConversionError,
    );
    assert.equal(sourceChanged, true);
    assert.deepEqual(await readState(), pendingState);

    let interrupted = false;

    await assert.rejects(
      runDataConversion({
        ...options,
        testHooks: {
          afterBatchCommit: () => {
            if (interrupted) {
              return;
            }

            interrupted = true;
            throw new Error('injected interruption');
          },
        },
      }),
      DataConversionError,
    );
    assert.equal(interrupted, true);

    const interruptedState = await readState();

    assert.match(interruptedState.emailCiphertext ?? '', /^enc:v1:1:/u);
    assert.match(interruptedState.nameCiphertext ?? '', /^enc:v1:1:/u);
    assert.equal(interruptedState.ipAddressCiphertext, null);
    assert.equal(interruptedState.tokenCiphertext, null);
    assert.equal(interruptedState.titleCiphertext, null);
    assert.equal(interruptedState.identifierCiphertext, null);
    assert.equal(interruptedState.valueCiphertext, null);
    assert.equal(interruptedState.backupCodes, serializedBackupCodes);

    assert.deepEqual(await runDataConversion(options), { converted: 4, counts });

    const completeState = await readState();

    for (const ciphertext of [
      completeState.emailCiphertext,
      completeState.nameCiphertext,
      completeState.ipAddressCiphertext,
      completeState.tokenCiphertext,
      completeState.titleCiphertext,
      completeState.identifierCiphertext,
      completeState.valueCiphertext,
    ]) {
      assert.match(ciphertext ?? '', /^enc:v1:1:/u);
    }

    assert.notEqual(completeState.backupCodes, serializedBackupCodes);
    assert.deepEqual(
      JSON.parse(
        await symmetricDecrypt({ data: completeState.backupCodes, key: betterAuthSecret }),
      ),
      backupCodes,
    );
    assert.deepEqual(await runDataConversion(options), { converted: 0, counts });
    assert.deepEqual(await readState(), completeState);

    await testDatabase.db.execute(sql`
      UPDATE "tasks"
      SET "title" = 'late-write-marker'
      WHERE "id" = ${taskId}
    `);
    await assert.rejects(runDataConversion(options), DataConversionError);

    const capturedOutput = stderr.join('');

    assert.match(capturedOutput, /"code":"data_conversion_progress"/u);
    assert.match(capturedOutput, /"code":"data_conversion_failure"/u);

    for (const marker of [
      betterAuthSecret,
      email,
      nickname,
      concurrentName,
      image,
      token,
      ipAddress,
      userAgent,
      title,
      identifier,
      ...backupCodes,
      'late-write-marker',
    ]) {
      assert.equal(capturedOutput.includes(marker), false);
    }
  } finally {
    await testDatabase.reset();
  }
});

test('runs the guarded local conversion command without leaking values', async () => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const userId = 'operator-user';
  const taskId = 'operator-task';
  const email = 'operator@example.test';
  const nickname = 'operator_user';
  const title = 'Operator conversion marker';
  const betterAuthSecret = 'operator-better-auth-secret-marker';
  const dataEncryptionKeys = JSON.stringify({ 1: key(11) });
  const blindIndexKeys = JSON.stringify({ 1: key(12) });
  const now = new Date();

  try {
    await testDatabase.db.execute(sql`
      INSERT INTO "user" (
        "id", "name", "email", "email_verified", "created_at", "updated_at"
      )
      VALUES (${userId}, ${nickname}, ${email}, true, ${now}, ${now})
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "tasks" ("id", "user_id", "title", "changed_on", "position")
      VALUES (${taskId}, ${userId}, ${title}, ${now}, 0)
    `);

    const { stderr, stdout } = await execFileAsync(
      process.execPath,
      [
        '--experimental-strip-types',
        'src/db/data-conversion-cli.ts',
        'test',
        'CONVERT-ATEMOYA-TEST',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          BETTER_AUTH_SECRET: betterAuthSecret,
          BLIND_INDEX_ACTIVE_VERSION: '1',
          BLIND_INDEX_KEYS: blindIndexKeys,
          DATA_ENCRYPTION_ACTIVE_VERSION: '1',
          DATA_ENCRYPTION_KEYS: dataEncryptionKeys,
        },
      },
    );
    const result = await testDatabase.db.execute<{
      emailCiphertext: string | null;
      titleCiphertext: string | null;
    }>(sql`
      SELECT
        users."email_ciphertext" AS "emailCiphertext",
        tasks."title_ciphertext" AS "titleCiphertext"
      FROM "user" AS users
      INNER JOIN "tasks" AS tasks ON tasks."id" = ${taskId}
      WHERE users."id" = ${userId}
    `);
    const [state] = result.rows;

    assert.ok(state);
    assert.match(state.emailCiphertext ?? '', /^enc:v1:1:/u);
    assert.match(state.titleCiphertext ?? '', /^enc:v1:1:/u);
    assert.equal(stdout, '');
    assert.match(stderr, /"code":"data_conversion_progress"/u);

    for (const marker of [
      betterAuthSecret,
      blindIndexKeys,
      dataEncryptionKeys,
      email,
      nickname,
      title,
      state.emailCiphertext,
      state.titleCiphertext,
    ]) {
      assert.equal(stderr.includes(marker ?? ''), false);
    }
  } finally {
    await testDatabase.reset();
  }
});

test('rejects normalized collisions and dormant OAuth tokens', async () => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: JSON.stringify({ 1: key(10) }),
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: JSON.stringify({ 1: key(9) }),
  });
  const now = new Date();
  const options = {
    betterAuthSecret: 'collision-better-auth-secret',
    confirmation: 'CONVERT-ATEMOYA-TEST',
    dataProtection,
    db: testDatabase.db,
    target: 'test',
  } as const;

  try {
    await testDatabase.db.execute(sql`
      INSERT INTO "user" (
        "id", "name", "email", "email_verified", "created_at", "updated_at"
      )
      VALUES
        ('collision-user-one', 'collision_one', 'collision@example.test', true, ${now}, ${now}),
        ('collision-user-two', 'collision_two', ' COLLISION@example.test ', true, ${now}, ${now})
    `);

    await assert.rejects(runConversionPreflight(options), DataConversionError);
    await testDatabase.reset();

    await testDatabase.db.execute(sql`
      INSERT INTO "user" (
        "id", "name", "email", "email_verified", "created_at", "updated_at"
      )
      VALUES ('oauth-user', 'oauth_user', 'oauth@example.test', true, ${now}, ${now})
    `);
    await testDatabase.db.execute(sql`
      INSERT INTO "account" (
        "id", "account_id", "provider_id", "user_id", "access_token",
        "created_at", "updated_at"
      )
      VALUES (
        'oauth-account', 'oauth-provider-account', 'provider', 'oauth-user',
        'dormant-oauth-token-marker', ${now}, ${now}
      )
    `);

    await assert.rejects(runConversionPreflight(options), DataConversionError);
  } finally {
    await testDatabase.reset();
  }
});
