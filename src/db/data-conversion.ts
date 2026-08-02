import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { and, asc, count, eq, gt, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

import { getVerificationMetadata } from '../lib/better-auth-data-protection.ts';
import type { createDataProtection, EncryptionContext } from '../lib/data-protection.ts';
import { logSecurityEvent } from '../lib/security-logger.ts';
import * as schema from './schema.ts';

type ConversionDatabase = NeonHttpDatabase<typeof schema>;
type DataProtection = ReturnType<typeof createDataProtection>;
type ConversionTarget = 'development' | 'production' | 'test';

interface ConversionPreflightOptions {
  batchSize?: number;
  betterAuthSecret: string;
  confirmation: string | undefined;
  dataProtection: DataProtection;
  db: ConversionDatabase;
  target: string | undefined;
  testHooks?: {
    afterBatchCommit?: () => Promise<void> | void;
    beforeBatchCommit?: () => Promise<void> | void;
  };
}

type DataConversionOptions = ConversionPreflightOptions;

interface ProtectedValue {
  ciphertext: string | null;
  context: EncryptionContext;
  createLookup?: (value: string) => string;
  lookup?: string | null;
  plaintext: string | null;
  required?: boolean;
}

interface SessionConversionRow {
  id: string;
  ipAddress: string | null;
  token: string | null;
  tokenCiphertext: string | null;
  userAgent: string | null;
}

interface TaskConversionRow {
  id: string;
  title: string | null;
  titleCiphertext: string | null;
  userId: string;
}

interface TwoFactorConversionRow {
  backupCodes: string;
  encryptedBackupCodes: string | null;
  id: string;
}

interface UserConversionRow {
  email: string | null;
  emailCiphertext: string | null;
  id: string;
  image: string | null;
  name: string | null;
}

interface VerificationConversionRow {
  id: string;
  identifier: string | null;
  identifierCiphertext: string | null;
  value: string | null;
}

export interface ConversionPreflightCounts {
  accounts: number;
  sessions: number;
  tasks: number;
  twoFactors: number;
  users: number;
  verifications: number;
}

export interface DataConversionResult {
  converted: number;
  counts: ConversionPreflightCounts;
}

const confirmations: Record<ConversionTarget, string> = {
  development: 'CONVERT-DEVELOPMENT-DATA',
  production: 'CONVERT-PRODUCTION-DATA',
  test: 'CONVERT-ATEMOYA-TEST',
};

export class DataConversionError extends Error {
  readonly code = 'DATA_CONVERSION_FAILED';

  constructor() {
    super('DATA_CONVERSION_FAILED');
    this.name = 'DataConversionError';
  }
}

const fail = (): never => {
  throw new DataConversionError();
};

export const assertConversionIntent = (
  target: string | undefined,
  confirmation: string | undefined,
) => {
  if (target !== 'development' && target !== 'production' && target !== 'test') {
    return fail();
  }

  if (confirmation !== confirmations[target]) {
    return fail();
  }

  return target;
};

const assertUnique = (values: Set<string>, value: string) => {
  if (values.has(value)) {
    return fail();
  }

  values.add(value);
};

const verifyProtectedValue = (
  dataProtection: DataProtection,
  { ciphertext, context, createLookup, lookup, plaintext, required = true }: ProtectedValue,
) => {
  if (plaintext === null) {
    if (required || ciphertext !== null || (createLookup && lookup !== null)) {
      return fail();
    }

    return;
  }

  if (ciphertext === null) {
    if (createLookup && lookup !== null) {
      return fail();
    }

    return false;
  }

  if (dataProtection.decryptValue(ciphertext, context) !== plaintext) {
    return fail();
  }

  if (createLookup && lookup !== createLookup(plaintext)) {
    return fail();
  }

  return true;
};

const assertConsistentRowState = (states: (boolean | undefined)[]) => {
  const populatedStates = states.filter((state): state is boolean => state !== undefined);

  if (populatedStates.some(Boolean) && !populatedStates.every(Boolean)) {
    return fail();
  }
};

const parseBackupCodes = (value: string) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }

  return (
    Array.isArray(parsed) && parsed.every((code) => typeof code === 'string' && code.length > 0)
  );
};

const verifyBackupCodes = async (value: string, secret: string) => {
  if (parseBackupCodes(value)) {
    return false;
  }

  const decrypted = await symmetricDecrypt({ data: value, key: secret });

  if (!parseBackupCodes(decrypted)) {
    return fail();
  }

  return true;
};

const scanBatches = async <Row extends { id: string }>(
  batchSize: number,
  load: (afterId: string | undefined) => Promise<Row[]>,
  inspect: (row: Row) => Promise<void> | void,
) => {
  let afterId: string | undefined;
  let scanned = 0;

  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- each stable cursor depends on the prior batch.
    const rows = await load(afterId);

    if (rows.length === 0) {
      return scanned;
    }

    // oxlint-disable-next-line no-await-in-loop -- inspection must finish before advancing the cursor.
    await Promise.all(rows.map(inspect));
    scanned += rows.length;

    const [lastRow] = rows.slice(-1);

    afterId = lastRow?.id;

    if (!afterId || rows.length < batchSize) {
      return scanned;
    }
  }
};

const preflight = async ({
  batchSize = 100,
  betterAuthSecret,
  dataProtection,
  db,
}: Omit<ConversionPreflightOptions, 'confirmation' | 'target'>) => {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || !betterAuthSecret) {
    return fail();
  }

  const [accountCountResult, oauthTokenCountResult] = await Promise.all([
    db.select({ value: count() }).from(schema.account),
    db
      .select({ value: count() })
      .from(schema.account)
      .where(
        or(
          isNotNull(schema.account.accessToken),
          isNotNull(schema.account.refreshToken),
          isNotNull(schema.account.idToken),
        ),
      ),
  ]);
  const accounts = accountCountResult[0]?.value;
  const oauthTokenCount = oauthTokenCountResult[0]?.value;

  if (accounts === undefined || oauthTokenCount !== 0) {
    return fail();
  }

  const emailLookups = new Set<string>();
  const nicknameLookups = new Set<string>();
  const sessionTokenLookups = new Set<string>();
  const taskTitleLookups = new Set<string>();
  let pendingRows = 0;

  const users = await scanBatches(
    batchSize,
    (afterId) =>
      db
        .select({
          email: schema.user.email,
          emailCiphertext: schema.user.emailCiphertext,
          emailLookup: schema.user.emailLookup,
          id: schema.user.id,
          image: schema.user.image,
          imageCiphertext: schema.user.imageCiphertext,
          name: schema.user.name,
          nameCiphertext: schema.user.nameCiphertext,
          nameLookup: schema.user.nameLookup,
        })
        .from(schema.user)
        .where(afterId ? gt(schema.user.id, afterId) : undefined)
        .orderBy(asc(schema.user.id))
        .limit(batchSize),
    (row) => {
      const emailLookup = row.email === null ? fail() : dataProtection.emailLookup(row.email);
      const nicknameLookup = row.name === null ? fail() : dataProtection.nicknameLookup(row.name);

      assertUnique(emailLookups, emailLookup);
      assertUnique(nicknameLookups, nicknameLookup);

      const states = [
        verifyProtectedValue(dataProtection, {
          ciphertext: row.emailCiphertext,
          context: { field: 'email', model: 'user', recordId: row.id },
          createLookup: dataProtection.emailLookup,
          lookup: row.emailLookup,
          plaintext: row.email,
        }),
        verifyProtectedValue(dataProtection, {
          ciphertext: row.nameCiphertext,
          context: { field: 'name', model: 'user', recordId: row.id },
          createLookup: dataProtection.nicknameLookup,
          lookup: row.nameLookup,
          plaintext: row.name,
        }),
        verifyProtectedValue(dataProtection, {
          ciphertext: row.imageCiphertext,
          context: { field: 'image', model: 'user', recordId: row.id },
          plaintext: row.image,
          required: false,
        }),
      ];

      assertConsistentRowState(states);

      if (states.some((state) => state === false)) {
        pendingRows += 1;
      }
    },
  );

  const sessions = await scanBatches(
    batchSize,
    (afterId) =>
      db
        .select({
          id: schema.session.id,
          ipAddress: schema.session.ipAddress,
          ipAddressCiphertext: schema.session.ipAddressCiphertext,
          token: schema.session.token,
          tokenCiphertext: schema.session.tokenCiphertext,
          tokenLookup: schema.session.tokenLookup,
          userAgent: schema.session.userAgent,
          userAgentCiphertext: schema.session.userAgentCiphertext,
        })
        .from(schema.session)
        .where(afterId ? gt(schema.session.id, afterId) : undefined)
        .orderBy(asc(schema.session.id))
        .limit(batchSize),
    (row) => {
      const tokenLookup =
        row.token === null ? fail() : dataProtection.sessionTokenLookup(row.token);

      assertUnique(sessionTokenLookups, tokenLookup);

      const states = [
        verifyProtectedValue(dataProtection, {
          ciphertext: row.tokenCiphertext,
          context: { field: 'token', model: 'session', recordId: row.id },
          createLookup: dataProtection.sessionTokenLookup,
          lookup: row.tokenLookup,
          plaintext: row.token,
        }),
        verifyProtectedValue(dataProtection, {
          ciphertext: row.ipAddressCiphertext,
          context: { field: 'ipAddress', model: 'session', recordId: row.id },
          plaintext: row.ipAddress,
          required: false,
        }),
        verifyProtectedValue(dataProtection, {
          ciphertext: row.userAgentCiphertext,
          context: { field: 'userAgent', model: 'session', recordId: row.id },
          plaintext: row.userAgent,
          required: false,
        }),
      ];

      assertConsistentRowState(states);

      if (states.some((state) => state === false)) {
        pendingRows += 1;
      }
    },
  );

  const tasks = await scanBatches(
    batchSize,
    (afterId) =>
      db
        .select({
          id: schema.tasks.id,
          title: schema.tasks.title,
          titleCiphertext: schema.tasks.titleCiphertext,
          titleLookup: schema.tasks.titleLookup,
          userId: schema.tasks.userId,
        })
        .from(schema.tasks)
        .where(afterId ? gt(schema.tasks.id, afterId) : undefined)
        .orderBy(asc(schema.tasks.id))
        .limit(batchSize),
    (row) => {
      const titleLookup =
        row.title === null ? fail() : dataProtection.taskTitleLookup(row.userId, row.title);

      assertUnique(taskTitleLookups, `${row.userId}\0${titleLookup}`);

      const state = verifyProtectedValue(dataProtection, {
        ciphertext: row.titleCiphertext,
        context: { field: 'title', model: 'tasks', recordId: row.id },
        createLookup: (title) => dataProtection.taskTitleLookup(row.userId, title),
        lookup: row.titleLookup,
        plaintext: row.title,
      });

      if (state === false) {
        pendingRows += 1;
      }
    },
  );

  const verifications = await scanBatches(
    batchSize,
    (afterId) =>
      db
        .select({
          id: schema.verification.id,
          identifier: schema.verification.identifier,
          identifierCiphertext: schema.verification.identifierCiphertext,
          identifierLookup: schema.verification.identifierLookup,
          purpose: schema.verification.purpose,
          subjectUserId: schema.verification.subjectUserId,
          value: schema.verification.value,
          valueCiphertext: schema.verification.valueCiphertext,
        })
        .from(schema.verification)
        .where(afterId ? gt(schema.verification.id, afterId) : undefined)
        .orderBy(asc(schema.verification.id))
        .limit(batchSize),
    (row) => {
      if (row.identifier === null || row.value === null) {
        return fail();
      }

      const states = [
        verifyProtectedValue(dataProtection, {
          ciphertext: row.identifierCiphertext,
          context: { field: 'identifier', model: 'verification', recordId: row.id },
          createLookup: dataProtection.verificationIdentifierLookup,
          lookup: row.identifierLookup,
          plaintext: row.identifier,
        }),
        verifyProtectedValue(dataProtection, {
          ciphertext: row.valueCiphertext,
          context: { field: 'value', model: 'verification', recordId: row.id },
          plaintext: row.value,
        }),
      ];
      const metadata = getVerificationMetadata(row.identifier, row.value);

      assertConsistentRowState(states);

      if (states.every((state) => state === false)) {
        if (row.purpose !== null || row.subjectUserId !== null) {
          return fail();
        }

        pendingRows += 1;
      } else if (row.purpose !== metadata.purpose || row.subjectUserId !== metadata.subjectUserId) {
        return fail();
      }
    },
  );

  const twoFactors = await scanBatches(
    batchSize,
    (afterId) =>
      db
        .select({
          backupCodes: schema.twoFactor.backupCodes,
          id: schema.twoFactor.id,
          secret: schema.twoFactor.secret,
        })
        .from(schema.twoFactor)
        .where(afterId ? gt(schema.twoFactor.id, afterId) : undefined)
        .orderBy(asc(schema.twoFactor.id))
        .limit(batchSize),
    async (row) => {
      const totpSecret = await symmetricDecrypt({ data: row.secret, key: betterAuthSecret });

      if (!totpSecret) {
        return fail();
      }

      if (!(await verifyBackupCodes(row.backupCodes, betterAuthSecret))) {
        pendingRows += 1;
      }
    },
  );

  return {
    counts: { accounts, sessions, tasks, twoFactors, users, verifications },
    pendingRows,
  };
};

interface ConvertBatchesOptions<Row extends { id: string }> {
  assertBatch: (rows: Row[]) => BatchItem<'pg'>;
  batchSize: number;
  createUpdate: (row: Row) => BatchItem<'pg'>;
  db: ConversionDatabase;
  isPending: (row: Row) => boolean;
  load: (afterId: string | undefined) => Promise<Row[]>;
  testHooks?: ConversionPreflightOptions['testHooks'];
  verify: () => Promise<void>;
}

const convertBatches = async <Row extends { id: string }>({
  assertBatch,
  batchSize,
  createUpdate,
  db,
  isPending,
  load,
  testHooks,
  verify,
}: ConvertBatchesOptions<Row>) => {
  let afterId: string | undefined;
  let converted = 0;

  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- each stable cursor depends on the prior batch.
    const rows = await load(afterId);

    if (rows.length === 0) {
      return converted;
    }

    const pendingRows = rows.filter(isPending);

    if (pendingRows.length > 0) {
      const updates = pendingRows.map(createUpdate);
      const [firstQuery, ...remainingQueries] = [...updates, assertBatch(pendingRows)];

      if (!firstQuery) {
        return fail();
      }

      // oxlint-disable-next-line no-await-in-loop -- deterministic injection must finish before the batch.
      await testHooks?.beforeBatchCommit?.();
      // oxlint-disable-next-line no-await-in-loop -- the next cursor must wait for commit and read-back.
      await db.batch([firstQuery, ...remainingQueries]);
      converted += pendingRows.length;
      // oxlint-disable-next-line no-await-in-loop -- deterministic injection must observe the committed batch.
      await testHooks?.afterBatchCommit?.();
      // ponytail: global read-back is simplest; use per-batch projections if conversion volume grows.
      // oxlint-disable-next-line no-await-in-loop -- verification must finish before advancing the cursor.
      await verify();
    }

    const [lastRow] = rows.slice(-1);

    afterId = lastRow?.id;

    if (!afterId || rows.length < batchSize) {
      return converted;
    }
  }
};

const batchCountAssertion = (expected: number) =>
  sql<number>`1 / (CASE WHEN count(*) = ${expected} THEN 1 ELSE 0 END)`;

const assertSameCounts = (before: ConversionPreflightCounts, after: ConversionPreflightCounts) => {
  for (const key of Object.keys(before) as (keyof ConversionPreflightCounts)[]) {
    if (before[key] !== after[key]) {
      return fail();
    }
  }
};

const convertPendingRows = async (
  options: Omit<DataConversionOptions, 'confirmation' | 'target'>,
) => {
  const { batchSize = 100, betterAuthSecret, dataProtection, db, testHooks } = options;
  const verify = async () => {
    await preflight(options);
  };
  let converted = 0;

  converted += await convertBatches<UserConversionRow>({
    assertBatch: (rows) =>
      db
        .select({ verified: batchCountAssertion(rows.length) })
        .from(schema.user)
        .where(
          and(
            inArray(
              schema.user.id,
              rows.map((row) => row.id),
            ),
            isNotNull(schema.user.emailCiphertext),
            isNotNull(schema.user.emailLookup),
            isNotNull(schema.user.nameCiphertext),
            isNotNull(schema.user.nameLookup),
            or(
              and(isNull(schema.user.image), isNull(schema.user.imageCiphertext)),
              and(isNotNull(schema.user.image), isNotNull(schema.user.imageCiphertext)),
            ),
          ),
        ),
    batchSize,
    createUpdate: (row) => {
      const email = row.email ?? fail();
      const name = row.name ?? fail();

      return db
        .update(schema.user)
        .set({
          emailCiphertext: dataProtection.encryptValue(email, {
            field: 'email',
            model: 'user',
            recordId: row.id,
          }),
          emailLookup: dataProtection.emailLookup(email),
          imageCiphertext:
            row.image === null
              ? null
              : dataProtection.encryptValue(row.image, {
                  field: 'image',
                  model: 'user',
                  recordId: row.id,
                }),
          nameCiphertext: dataProtection.encryptValue(name, {
            field: 'name',
            model: 'user',
            recordId: row.id,
          }),
          nameLookup: dataProtection.nicknameLookup(name),
        })
        .where(
          and(
            eq(schema.user.id, row.id),
            eq(schema.user.email, email),
            eq(schema.user.name, name),
            row.image === null ? isNull(schema.user.image) : eq(schema.user.image, row.image),
            isNull(schema.user.emailCiphertext),
            isNull(schema.user.emailLookup),
            isNull(schema.user.imageCiphertext),
            isNull(schema.user.nameCiphertext),
            isNull(schema.user.nameLookup),
          ),
        )
        .returning({ id: schema.user.id });
    },
    db,
    isPending: (row) => row.emailCiphertext === null,
    load: (afterId) =>
      db
        .select({
          email: schema.user.email,
          emailCiphertext: schema.user.emailCiphertext,
          id: schema.user.id,
          image: schema.user.image,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(afterId ? gt(schema.user.id, afterId) : undefined)
        .orderBy(asc(schema.user.id))
        .limit(batchSize),
    testHooks,
    verify,
  });

  converted += await convertBatches<SessionConversionRow>({
    assertBatch: (rows) =>
      db
        .select({ verified: batchCountAssertion(rows.length) })
        .from(schema.session)
        .where(
          and(
            inArray(
              schema.session.id,
              rows.map((row) => row.id),
            ),
            isNotNull(schema.session.tokenCiphertext),
            isNotNull(schema.session.tokenLookup),
            or(
              and(isNull(schema.session.ipAddress), isNull(schema.session.ipAddressCiphertext)),
              and(
                isNotNull(schema.session.ipAddress),
                isNotNull(schema.session.ipAddressCiphertext),
              ),
            ),
            or(
              and(isNull(schema.session.userAgent), isNull(schema.session.userAgentCiphertext)),
              and(
                isNotNull(schema.session.userAgent),
                isNotNull(schema.session.userAgentCiphertext),
              ),
            ),
          ),
        ),
    batchSize,
    createUpdate: (row) => {
      const token = row.token ?? fail();

      return db
        .update(schema.session)
        .set({
          ipAddressCiphertext:
            row.ipAddress === null
              ? null
              : dataProtection.encryptValue(row.ipAddress, {
                  field: 'ipAddress',
                  model: 'session',
                  recordId: row.id,
                }),
          tokenCiphertext: dataProtection.encryptValue(token, {
            field: 'token',
            model: 'session',
            recordId: row.id,
          }),
          tokenLookup: dataProtection.sessionTokenLookup(token),
          userAgentCiphertext:
            row.userAgent === null
              ? null
              : dataProtection.encryptValue(row.userAgent, {
                  field: 'userAgent',
                  model: 'session',
                  recordId: row.id,
                }),
        })
        .where(
          and(
            eq(schema.session.id, row.id),
            eq(schema.session.token, token),
            row.ipAddress === null
              ? isNull(schema.session.ipAddress)
              : eq(schema.session.ipAddress, row.ipAddress),
            row.userAgent === null
              ? isNull(schema.session.userAgent)
              : eq(schema.session.userAgent, row.userAgent),
            isNull(schema.session.ipAddressCiphertext),
            isNull(schema.session.tokenCiphertext),
            isNull(schema.session.tokenLookup),
            isNull(schema.session.userAgentCiphertext),
          ),
        )
        .returning({ id: schema.session.id });
    },
    db,
    isPending: (row) => row.tokenCiphertext === null,
    load: (afterId) =>
      db
        .select({
          id: schema.session.id,
          ipAddress: schema.session.ipAddress,
          token: schema.session.token,
          tokenCiphertext: schema.session.tokenCiphertext,
          userAgent: schema.session.userAgent,
        })
        .from(schema.session)
        .where(afterId ? gt(schema.session.id, afterId) : undefined)
        .orderBy(asc(schema.session.id))
        .limit(batchSize),
    testHooks,
    verify,
  });

  converted += await convertBatches<TaskConversionRow>({
    assertBatch: (rows) =>
      db
        .select({ verified: batchCountAssertion(rows.length) })
        .from(schema.tasks)
        .where(
          and(
            inArray(
              schema.tasks.id,
              rows.map((row) => row.id),
            ),
            isNotNull(schema.tasks.titleCiphertext),
            isNotNull(schema.tasks.titleLookup),
          ),
        ),
    batchSize,
    createUpdate: (row) => {
      const title = row.title ?? fail();

      return db
        .update(schema.tasks)
        .set({
          titleCiphertext: dataProtection.encryptValue(title, {
            field: 'title',
            model: 'tasks',
            recordId: row.id,
          }),
          titleLookup: dataProtection.taskTitleLookup(row.userId, title),
        })
        .where(
          and(
            eq(schema.tasks.id, row.id),
            eq(schema.tasks.userId, row.userId),
            eq(schema.tasks.title, title),
            isNull(schema.tasks.titleCiphertext),
            isNull(schema.tasks.titleLookup),
          ),
        )
        .returning({ id: schema.tasks.id });
    },
    db,
    isPending: (row) => row.titleCiphertext === null,
    load: (afterId) =>
      db
        .select({
          id: schema.tasks.id,
          title: schema.tasks.title,
          titleCiphertext: schema.tasks.titleCiphertext,
          userId: schema.tasks.userId,
        })
        .from(schema.tasks)
        .where(afterId ? gt(schema.tasks.id, afterId) : undefined)
        .orderBy(asc(schema.tasks.id))
        .limit(batchSize),
    testHooks,
    verify,
  });

  converted += await convertBatches<VerificationConversionRow>({
    assertBatch: (rows) =>
      db
        .select({ verified: batchCountAssertion(rows.length) })
        .from(schema.verification)
        .where(
          and(
            inArray(
              schema.verification.id,
              rows.map((row) => row.id),
            ),
            isNotNull(schema.verification.identifierCiphertext),
            isNotNull(schema.verification.identifierLookup),
            isNotNull(schema.verification.purpose),
            isNotNull(schema.verification.valueCiphertext),
          ),
        ),
    batchSize,
    createUpdate: (row) => {
      const identifier = row.identifier ?? fail();
      const value = row.value ?? fail();
      const metadata = getVerificationMetadata(identifier, value);

      return db
        .update(schema.verification)
        .set({
          identifierCiphertext: dataProtection.encryptValue(identifier, {
            field: 'identifier',
            model: 'verification',
            recordId: row.id,
          }),
          identifierLookup: dataProtection.verificationIdentifierLookup(identifier),
          purpose: metadata.purpose,
          subjectUserId: metadata.subjectUserId,
          valueCiphertext: dataProtection.encryptValue(value, {
            field: 'value',
            model: 'verification',
            recordId: row.id,
          }),
        })
        .where(
          and(
            eq(schema.verification.id, row.id),
            eq(schema.verification.identifier, identifier),
            eq(schema.verification.value, value),
            isNull(schema.verification.identifierCiphertext),
            isNull(schema.verification.identifierLookup),
            isNull(schema.verification.purpose),
            isNull(schema.verification.subjectUserId),
            isNull(schema.verification.valueCiphertext),
          ),
        )
        .returning({ id: schema.verification.id });
    },
    db,
    isPending: (row) => row.identifierCiphertext === null,
    load: (afterId) =>
      db
        .select({
          id: schema.verification.id,
          identifier: schema.verification.identifier,
          identifierCiphertext: schema.verification.identifierCiphertext,
          value: schema.verification.value,
        })
        .from(schema.verification)
        .where(afterId ? gt(schema.verification.id, afterId) : undefined)
        .orderBy(asc(schema.verification.id))
        .limit(batchSize),
    testHooks,
    verify,
  });

  converted += await convertBatches<TwoFactorConversionRow>({
    assertBatch: (rows) =>
      db
        .select({ verified: batchCountAssertion(rows.length) })
        .from(schema.twoFactor)
        .where(
          or(
            ...rows.map((row) =>
              and(
                eq(schema.twoFactor.id, row.id),
                ne(schema.twoFactor.backupCodes, row.backupCodes),
              ),
            ),
          ),
        ),
    batchSize,
    createUpdate: (row) => {
      const encryptedBackupCodes = row.encryptedBackupCodes ?? fail();

      return db
        .update(schema.twoFactor)
        .set({ backupCodes: encryptedBackupCodes })
        .where(
          and(eq(schema.twoFactor.id, row.id), eq(schema.twoFactor.backupCodes, row.backupCodes)),
        )
        .returning({ id: schema.twoFactor.id });
    },
    db,
    isPending: (row) => row.encryptedBackupCodes !== null,
    load: async (afterId) => {
      const rows = await db
        .select({ backupCodes: schema.twoFactor.backupCodes, id: schema.twoFactor.id })
        .from(schema.twoFactor)
        .where(afterId ? gt(schema.twoFactor.id, afterId) : undefined)
        .orderBy(asc(schema.twoFactor.id))
        .limit(batchSize);

      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          encryptedBackupCodes: parseBackupCodes(row.backupCodes)
            ? await symmetricEncrypt({ data: row.backupCodes, key: betterAuthSecret })
            : null,
        })),
      );
    },
    testHooks,
    verify,
  });

  return converted;
};

export const runDataConversion = async (options: DataConversionOptions) => {
  let phase: 'convert' | 'intent' | 'preflight' | 'verify' = 'intent';

  try {
    assertConversionIntent(options.target, options.confirmation);
    phase = 'preflight';

    const before = await preflight(options);

    phase = 'convert';

    const converted = await convertPendingRows(options);

    logSecurityEvent({
      code: 'data_conversion_progress',
      count: converted,
      phase,
      severity: 'info',
    });
    phase = 'verify';

    const after = await preflight(options);

    assertSameCounts(before.counts, after.counts);

    if (after.pendingRows !== 0) {
      return fail();
    }

    const total = Object.values(after.counts).reduce((sum, value) => sum + value, 0);

    logSecurityEvent({ code: 'data_conversion_progress', count: total, phase, severity: 'info' });

    return { converted, counts: after.counts };
  } catch {
    logSecurityEvent({ code: 'data_conversion_failure', phase, severity: 'error' });

    return fail();
  }
};

export const runConversionPreflight = async (options: ConversionPreflightOptions) => {
  let phase: 'intent' | 'preflight' = 'intent';

  try {
    assertConversionIntent(options.target, options.confirmation);
    phase = 'preflight';

    const { counts } = await preflight(options);
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    logSecurityEvent({ code: 'data_conversion_progress', count: total, phase, severity: 'info' });

    return counts;
  } catch {
    logSecurityEvent({ code: 'data_conversion_failure', phase, severity: 'error' });

    return fail();
  }
};
