import assert from 'node:assert/strict';
import test from 'node:test';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { symmetricDecrypt } from 'better-auth/crypto';
import { twoFactor } from 'better-auth/plugins';
import { sql } from 'drizzle-orm';

import {
  BetterAuthDataProtectionError,
  betterAuthDataProtectionFields,
  protectBetterAuthAdapter,
} from '../lib/better-auth-data-protection.ts';
import { authBackupCodePolicy } from '../lib/auth-policy.ts';
import { createDataProtection } from '../lib/data-protection.ts';
import { betterAuthLogger } from '../lib/security-logger.ts';
import * as schema from './schema.ts';
import { createTestDatabase } from './test-database.ts';

interface UserRecord extends Record<string, unknown> {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
  updatedAt: Date;
}

interface SessionRecord extends Record<string, unknown> {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ipAddress: string | null;
  token: string;
  updatedAt: Date;
  user?: UserRecord;
  userAgent: string | null;
  userId: string;
}

interface VerificationRecord extends Record<string, unknown> {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identifier: string;
  updatedAt: Date;
  value: string;
}

interface PersistedAuthState extends Record<string, unknown> {
  emailCiphertext: string;
  emailLookup: string;
  identifierCiphertext: string;
  identifierLookup: string;
  imageCiphertext: string | null;
  ipAddressCiphertext: string | null;
  nameCiphertext: string;
  nameLookup: string;
  purpose: string;
  subjectUserId: string | null;
  tokenCiphertext: string;
  tokenLookup: string;
  userAgentCiphertext: string | null;
  valueCiphertext: string;
}

interface TwoFactorRecord extends Record<string, unknown> {
  failedVerificationCount: number;
  id: string;
}

interface StoredBackupCodes extends Record<string, unknown> {
  backupCodes: string;
}

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');
const getCookieHeader = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(';', 1)[0])
    .filter((cookie): cookie is string => Boolean(cookie))
    .join('; ');

test('protects Better Auth records through the guarded adapter', async (context) => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: JSON.stringify({ 1: key(4) }),
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: JSON.stringify({ 1: key(3) }),
  });
  const baseAdapter = drizzleAdapter(testDatabase.db, {
    provider: 'pg',
    schema,
  });
  const options = {
    database: baseAdapter,
    plugins: [twoFactor()],
    secret: 'integration-only-better-auth-secret',
    session: betterAuthDataProtectionFields.session,
    user: betterAuthDataProtectionFields.user,
    verification: betterAuthDataProtectionFields.verification,
  } satisfies BetterAuthOptions;
  const adapter = protectBetterAuthAdapter(baseAdapter, dataProtection)(options);
  const email = 'encrypted@example.test';
  const initialName = 'encrypted_user';
  const updatedName = 'renamed_user';
  const image = 'https://example.test/avatar.png';
  const token = 'session-secret-marker';
  const ipAddress = '203.0.113.7';
  const userAgent = 'integration-agent-marker';
  const trustIdentifier = 'trust-device-integration-marker';
  const resetIdentifier = 'reset-password:integration-marker';
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  try {
    const now = new Date();
    const user = await adapter.create<Omit<UserRecord, 'id'>, UserRecord>({
      data: {
        createdAt: now,
        email,
        emailVerified: false,
        image,
        name: initialName,
        updatedAt: now,
      },
      model: 'user',
    });

    assert.ok(user.id);
    assert.equal(user.email, email);
    assert.equal(user.name, initialName);
    assert.equal(user.image, image);

    const selectedUser = await adapter.findOne<{ email: string }>({
      model: 'user',
      select: ['email'],
      where: [{ field: 'email', mode: 'insensitive', value: email.toUpperCase() }],
    });

    assert.deepEqual(selectedUser, { email });

    const updatedUser = await adapter.update<UserRecord>({
      model: 'user',
      update: { name: updatedName },
      where: [{ field: 'id', value: user.id }],
    });

    assert.equal(updatedUser?.name, updatedName);

    const foundUser = await adapter.findOne<UserRecord>({
      model: 'user',
      where: [{ field: 'name', value: updatedName }],
    });

    assert.equal(foundUser?.id, user.id);

    const session = await adapter.create<Omit<SessionRecord, 'id' | 'user'>, SessionRecord>({
      data: {
        createdAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
        ipAddress,
        token,
        updatedAt: now,
        userAgent,
        userId: user.id,
      },
      model: 'session',
    });

    assert.equal(session.token, token);
    assert.equal(session.ipAddress, ipAddress);
    assert.equal(session.userAgent, userAgent);

    const joinedSession = await adapter.findOne<SessionRecord>({
      join: { user: true },
      model: 'session',
      where: [{ field: 'token', value: token }],
    });

    assert.equal(joinedSession?.user?.email, email);
    assert.equal(joinedSession?.user?.name, updatedName);

    await adapter.create({
      data: {
        accountId: user.id,
        createdAt: now,
        password: 'better-auth-owned-password-hash',
        providerId: 'credential',
        updatedAt: now,
        userId: user.id,
      },
      model: 'account',
    });

    const joinedAccount = await adapter.findOne<{ user: UserRecord }>({
      join: { user: true },
      model: 'account',
      where: [
        { field: 'accountId', value: user.id },
        { field: 'providerId', value: 'credential' },
      ],
    });

    assert.equal(joinedAccount?.user.email, email);
    assert.equal(joinedAccount?.user.name, updatedName);

    const trustVerification = await adapter.create<
      Omit<VerificationRecord, 'id'>,
      VerificationRecord
    >({
      data: {
        createdAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
        identifier: trustIdentifier,
        updatedAt: now,
        value: user.id,
      },
      model: 'verification',
    });

    assert.equal(trustVerification.identifier, trustIdentifier);
    assert.equal(trustVerification.value, user.id);

    const resetVerification = await adapter.create<
      Omit<VerificationRecord, 'id'>,
      VerificationRecord
    >({
      data: {
        createdAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
        identifier: resetIdentifier,
        updatedAt: now,
        value: user.id,
      },
      model: 'verification',
    });
    const consumed = await adapter.consumeOne<VerificationRecord>({
      model: 'verification',
      where: [{ field: 'identifier', value: resetIdentifier }],
    });

    assert.equal(consumed?.id, resetVerification.id);
    assert.equal(consumed?.identifier, resetIdentifier);
    assert.equal(
      await adapter.count({
        model: 'verification',
        where: [{ field: 'identifier', value: resetIdentifier }],
      }),
      0,
    );

    const twoFactorRecord = await adapter.create<
      {
        backupCodes: string;
        failedVerificationCount: number;
        lockedUntil: null;
        secret: string;
        userId: string;
        verified: boolean;
      },
      TwoFactorRecord
    >({
      data: {
        backupCodes: 'better-auth-owned-ciphertext',
        failedVerificationCount: 0,
        lockedUntil: null,
        secret: 'better-auth-owned-secret',
        userId: user.id,
        verified: true,
      },
      model: 'twoFactor',
    });
    const incremented = await adapter.incrementOne<TwoFactorRecord>({
      increment: { failedVerificationCount: 1 },
      model: 'twoFactor',
      where: [{ field: 'id', value: twoFactorRecord.id }],
    });

    assert.equal(incremented?.failedVerificationCount, 1);

    const transactionUser = await adapter.transaction((transactionAdapter) =>
      transactionAdapter.findOne<UserRecord>({
        model: 'user',
        where: [{ field: 'email', value: email }],
      }),
    );

    assert.equal(transactionUser?.id, user.id);

    const persisted = await testDatabase.db.execute<PersistedAuthState>(sql`
      SELECT
        users."email_ciphertext" AS "emailCiphertext",
        users."email_lookup" AS "emailLookup",
        users."image_ciphertext" AS "imageCiphertext",
        users."name_ciphertext" AS "nameCiphertext",
        users."name_lookup" AS "nameLookup",
        sessions."ip_address_ciphertext" AS "ipAddressCiphertext",
        sessions."token_ciphertext" AS "tokenCiphertext",
        sessions."token_lookup" AS "tokenLookup",
        sessions."user_agent_ciphertext" AS "userAgentCiphertext",
        verifications."identifier_ciphertext" AS "identifierCiphertext",
        verifications."identifier_lookup" AS "identifierLookup",
        verifications."purpose",
        verifications."subject_user_id" AS "subjectUserId",
        verifications."value_ciphertext" AS "valueCiphertext"
      FROM "user" AS users
      INNER JOIN "session" AS sessions ON sessions."user_id" = users."id"
      INNER JOIN "verification" AS verifications ON verifications."id" = ${trustVerification.id}
      WHERE users."id" = ${user.id}
    `);
    const [authState] = persisted.rows;

    assert.ok(authState);

    for (const ciphertext of [
      authState.emailCiphertext,
      authState.imageCiphertext,
      authState.nameCiphertext,
      authState.ipAddressCiphertext,
      authState.tokenCiphertext,
      authState.userAgentCiphertext,
      authState.identifierCiphertext,
      authState.valueCiphertext,
    ]) {
      assert.match(ciphertext ?? '', /^enc:v1:1:/u);
    }

    for (const lookup of [
      authState.emailLookup,
      authState.nameLookup,
      authState.tokenLookup,
      authState.identifierLookup,
    ]) {
      assert.ok(lookup);
    }

    assert.equal(authState.purpose, 'trust-device');
    assert.equal(authState.subjectUserId, user.id);

    assert.equal(
      await adapter.deleteMany({
        model: 'verification',
        where: [
          { field: 'purpose', value: 'trust-device' },
          { field: 'subjectUserId', value: user.id },
        ],
      }),
      1,
    );

    await assert.rejects(
      adapter.updateMany({
        model: 'user',
        update: { email: 'must-not-be-logged@example.test' },
        where: [{ field: 'id', value: user.id }],
      }),
      BetterAuthDataProtectionError,
    );
    await assert.rejects(
      adapter.findMany({
        model: 'user',
        sortBy: { direction: 'asc', field: 'email' },
      }),
      BetterAuthDataProtectionError,
    );

    const capturedOutput = stderr.join('');

    assert.match(capturedOutput, /"code":"better_auth_adapter_failure"/u);

    for (const marker of [
      email,
      initialName,
      updatedName,
      image,
      token,
      ipAddress,
      userAgent,
      trustIdentifier,
      resetIdentifier,
      'must-not-be-logged@example.test',
    ]) {
      assert.equal(capturedOutput.includes(marker), false);
    }
  } finally {
    await testDatabase.reset();
  }
});

test('stores and consumes Better Auth backup codes as ciphertext', async (context) => {
  const testDatabase = await createTestDatabase();

  await testDatabase.migrate();
  await testDatabase.reset();

  const dataProtection = createDataProtection({
    blindIndexActiveVersion: '1',
    blindIndexKeys: JSON.stringify({ 1: key(6) }),
    dataEncryptionActiveVersion: '1',
    dataEncryptionKeys: JSON.stringify({ 1: key(5) }),
  });
  const baseAdapter = drizzleAdapter(testDatabase.db, {
    provider: 'pg',
    schema,
  });
  const database = protectBetterAuthAdapter(baseAdapter, dataProtection);
  const secret = 'integration-only-backup-code-secret';
  const password = 'Backup-Code-Test-Password-1';
  const [initialCodes, regeneratedCodes] = [
    ['first-code-one', 'first-code-two'],
    ['second-code-one', 'second-code-two'],
  ];
  const codeSets = [initialCodes, regeneratedCodes];
  let generationIndex = 0;
  const auth = betterAuth({
    baseURL: 'http://localhost:3000',
    database,
    emailAndPassword: { enabled: true },
    logger: betterAuthLogger,
    plugins: [
      twoFactor({
        backupCodeOptions: {
          ...authBackupCodePolicy,
          customBackupCodesGenerate: () => {
            const codes = codeSets[generationIndex];

            assert.ok(codes);
            generationIndex += 1;

            return [...codes];
          },
        },
        skipVerificationOnEnable: true,
      }),
    ],
    secret,
    session: betterAuthDataProtectionFields.session,
    user: betterAuthDataProtectionFields.user,
    verification: betterAuthDataProtectionFields.verification,
  });
  const stderr: string[] = [];

  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  try {
    const signUp = await auth.api.signUpEmail({
      body: {
        email: 'backup-codes@example.test',
        name: 'backup_codes_user',
        password,
      },
      returnHeaders: true,
    });
    const signUpCookie = getCookieHeader(signUp.headers);

    assert.ok(signUpCookie);

    const enabled = await auth.api.enableTwoFactor({
      body: { password },
      headers: new Headers({ cookie: signUpCookie }),
      returnHeaders: true,
    });
    const authenticatedCookie = getCookieHeader(enabled.headers);
    const [initialCode] = initialCodes;

    assert.ok(authenticatedCookie);
    assert.deepEqual(enabled.response.backupCodes, initialCodes);

    const readStoredBackupCodes = async () => {
      const result = await testDatabase.db.execute<StoredBackupCodes>(sql`
        SELECT "backup_codes" AS "backupCodes"
        FROM "two_factor"
        WHERE "user_id" = ${signUp.response.user.id}
      `);
      const [stored] = result.rows;

      assert.ok(stored);

      return stored.backupCodes;
    };
    const initialStored = await readStoredBackupCodes();

    assert.notEqual(initialStored, JSON.stringify(initialCodes));
    assert.deepEqual(
      JSON.parse(await symmetricDecrypt({ data: initialStored, key: secret })),
      initialCodes,
    );

    const regenerated = await auth.api.generateBackupCodes({
      body: { password },
      headers: new Headers({ cookie: authenticatedCookie }),
    });
    const [regeneratedCode, remainingRegeneratedCode] = regeneratedCodes;
    const regeneratedStored = await readStoredBackupCodes();

    assert.deepEqual(regenerated.backupCodes, regeneratedCodes);
    assert.notEqual(regeneratedStored, initialStored);
    assert.deepEqual(
      JSON.parse(await symmetricDecrypt({ data: regeneratedStored, key: secret })),
      regeneratedCodes,
    );
    await assert.rejects(
      auth.api.verifyBackupCode({
        body: { code: initialCode ?? '', disableSession: true },
        headers: new Headers({ cookie: authenticatedCookie }),
      }),
    );
    await auth.api.verifyBackupCode({
      body: { code: regeneratedCode ?? '', disableSession: true },
      headers: new Headers({ cookie: authenticatedCookie }),
    });

    const consumedStored = await readStoredBackupCodes();

    assert.notEqual(consumedStored, regeneratedStored);
    assert.deepEqual(JSON.parse(await symmetricDecrypt({ data: consumedStored, key: secret })), [
      remainingRegeneratedCode,
    ]);

    const capturedOutput = stderr.join('');

    for (const marker of [secret, password, ...codeSets.flat()]) {
      assert.equal(capturedOutput.includes(marker), false);
    }
  } finally {
    await testDatabase.reset();
  }
});
