import { symmetricDecrypt } from 'better-auth/crypto';
import { asc, count, gt, isNotNull, or } from 'drizzle-orm';
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
}

interface ProtectedValue {
  ciphertext: string | null;
  context: EncryptionContext;
  createLookup?: (value: string) => string;
  lookup?: string | null;
  plaintext: string | null;
  required?: boolean;
}

export interface ConversionPreflightCounts {
  accounts: number;
  sessions: number;
  tasks: number;
  twoFactors: number;
  users: number;
  verifications: number;
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
    return;
  }

  const decrypted = await symmetricDecrypt({ data: value, key: secret });

  if (!parseBackupCodes(decrypted)) {
    return fail();
  }
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
      assertConsistentRowState([
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
      ]);
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
      assertConsistentRowState([
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
      ]);
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
      verifyProtectedValue(dataProtection, {
        ciphertext: row.titleCiphertext,
        context: { field: 'title', model: 'tasks', recordId: row.id },
        createLookup: (title) => dataProtection.taskTitleLookup(row.userId, title),
        lookup: row.titleLookup,
        plaintext: row.title,
      });
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

      await verifyBackupCodes(row.backupCodes, betterAuthSecret);
    },
  );

  return { accounts, sessions, tasks, twoFactors, users, verifications };
};

export const runConversionPreflight = async (options: ConversionPreflightOptions) => {
  let phase: 'intent' | 'preflight' = 'intent';

  try {
    assertConversionIntent(options.target, options.confirmation);
    phase = 'preflight';

    const counts = await preflight(options);
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    logSecurityEvent({ code: 'data_conversion_progress', count: total, phase, severity: 'info' });

    return counts;
  } catch {
    logSecurityEvent({ code: 'data_conversion_failure', phase, severity: 'error' });

    return fail();
  }
};
