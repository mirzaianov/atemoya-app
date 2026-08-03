import { generateId } from 'better-auth';

import type {
  BetterAuthOptions,
  DBAdapter,
  DBAdapterInstance,
  DBTransactionAdapter,
  JoinOption,
  Where,
} from 'better-auth';

import type { createDataProtection, EncryptionContext } from './data-protection.ts';
import { logSecurityEvent } from './security-logger.ts';

/* oxlint-disable promise/prefer-await-to-callbacks -- Better Auth exposes callback-based adapter and transaction APIs. */

type DataProtection = ReturnType<typeof createDataProtection>;
type ProtectedModel = 'session' | 'user' | 'verification';
type AdapterOperation =
  | 'count'
  | 'create'
  | 'delete'
  | 'deleteMany'
  | 'findMany'
  | 'findOne'
  | 'incrementOne'
  | 'transaction'
  | 'update'
  | 'updateMany'
  | 'consumeOne';

interface ProtectedField {
  context: (recordId: string) => EncryptionContext;
  lookup?: (dataProtection: DataProtection, value: string) => string;
  lookupField?: string;
  normalizedEquality?: boolean;
}

const hiddenStringField = {
  input: false,
  required: false,
  returned: false,
  type: 'string',
} as const;

export const betterAuthDataProtectionFields = {
  session: {
    additionalFields: {
      tokenLookup: hiddenStringField,
    },
  },
  user: {
    additionalFields: {
      emailLookup: hiddenStringField,
      nameLookup: hiddenStringField,
    },
  },
  verification: {
    additionalFields: {
      identifierLookup: hiddenStringField,
      purpose: hiddenStringField,
      subjectUserId: hiddenStringField,
    },
  },
} as const;

const protectedFields: Record<ProtectedModel, Record<string, ProtectedField>> = {
  session: {
    ipAddress: {
      context: (recordId) => ({ field: 'ipAddress', model: 'session', recordId }),
    },
    token: {
      context: (recordId) => ({ field: 'token', model: 'session', recordId }),
      lookup: (dataProtection, value) => dataProtection.sessionTokenLookup(value),
      lookupField: 'tokenLookup',
    },
    userAgent: {
      context: (recordId) => ({ field: 'userAgent', model: 'session', recordId }),
    },
  },
  user: {
    email: {
      context: (recordId) => ({ field: 'email', model: 'user', recordId }),
      lookup: (dataProtection, value) => dataProtection.emailLookup(value),
      lookupField: 'emailLookup',
      normalizedEquality: true,
    },
    image: {
      context: (recordId) => ({ field: 'image', model: 'user', recordId }),
    },
    name: {
      context: (recordId) => ({ field: 'name', model: 'user', recordId }),
      lookup: (dataProtection, value) => dataProtection.nicknameLookup(value),
      lookupField: 'nameLookup',
      normalizedEquality: true,
    },
  },
  verification: {
    identifier: {
      context: (recordId) => ({ field: 'identifier', model: 'verification', recordId }),
      lookup: (dataProtection, value) => dataProtection.verificationIdentifierLookup(value),
      lookupField: 'identifierLookup',
    },
    value: {
      context: (recordId) => ({ field: 'value', model: 'verification', recordId }),
    },
  },
};

export class BetterAuthDataProtectionError extends Error {
  readonly code = 'BETTER_AUTH_DATA_PROTECTION_FAILED';

  constructor() {
    super('BETTER_AUTH_DATA_PROTECTION_FAILED');
    this.name = 'BetterAuthDataProtectionError';
  }
}

const fail = (): never => {
  throw new BetterAuthDataProtectionError();
};

const run = async <Result>(operation: AdapterOperation, callback: () => Promise<Result>) => {
  try {
    return await callback();
  } catch {
    logSecurityEvent({ code: 'better_auth_adapter_failure', operation, severity: 'error' });

    return fail();
  }
};

const isProtectedModel = (model: string): model is ProtectedModel => model in protectedFields;

const hasProtectedValue = (model: ProtectedModel, data: Record<string, unknown>) =>
  Object.keys(protectedFields[model]).some((field) => data[field] !== undefined);

const exactRecordId = (where: Where[]) => {
  const idConditions = where.filter(
    (condition) =>
      condition.field === 'id' &&
      (condition.operator === undefined || condition.operator === 'eq') &&
      condition.value !== null &&
      !Array.isArray(condition.value),
  );

  if (idConditions.length !== 1) {
    return fail();
  }

  const recordId = String(idConditions[0]?.value ?? '');

  return recordId || fail();
};

const createRecordId = (
  options: BetterAuthOptions,
  model: ProtectedModel,
  data: Record<string, unknown>,
  forceAllowId: boolean,
) => {
  if (forceAllowId && typeof data.id === 'string' && data.id) {
    return data.id;
  }

  const configuredGenerator = options.advanced?.database?.generateId;

  if (configuredGenerator === false || configuredGenerator === 'serial') {
    return fail();
  }

  let recordId: false | string;

  if (typeof configuredGenerator === 'function') {
    recordId = configuredGenerator({ model });
  } else if (configuredGenerator === 'uuid') {
    recordId = crypto.randomUUID();
  } else {
    recordId = generateId();
  }

  return typeof recordId === 'string' && recordId ? recordId : fail();
};

export const getVerificationMetadata = (identifier: string, value: string) => {
  if (identifier.startsWith('trust-device-')) {
    return { purpose: 'trust-device', subjectUserId: value };
  }

  if (identifier.startsWith('reset-password:')) {
    return { purpose: 'password-reset', subjectUserId: value };
  }

  if (identifier.startsWith('delete-account-')) {
    return { purpose: 'account-deletion', subjectUserId: value };
  }

  if (identifier.startsWith('2fa-attempts-')) {
    return { purpose: 'two-factor-attempt-counter', subjectUserId: null };
  }

  if (identifier.startsWith('2fa-otp-')) {
    return { purpose: 'two-factor-otp', subjectUserId: null };
  }

  if (identifier.startsWith('2fa-')) {
    return { purpose: 'two-factor-challenge', subjectUserId: value };
  }

  return { purpose: 'other', subjectUserId: null };
};

const transformWrite = (
  model: ProtectedModel,
  data: Record<string, unknown>,
  recordId: string,
  dataProtection: DataProtection,
) => {
  const transformed = { ...data };

  if (model === 'verification' && hasProtectedValue(model, data)) {
    if (typeof data.identifier !== 'string' || typeof data.value !== 'string') {
      return fail();
    }

    Object.assign(transformed, getVerificationMetadata(data.identifier, data.value));
  }

  for (const [field, configuration] of Object.entries(protectedFields[model])) {
    const value = data[field];

    if (value === undefined) {
      continue;
    }

    if (value === null) {
      transformed[field] = null;

      if (configuration.lookupField) {
        transformed[configuration.lookupField] = null;
      }

      continue;
    }

    if (typeof value !== 'string') {
      return fail();
    }

    transformed[field] = dataProtection.encryptValue(value, configuration.context(recordId));

    if (configuration.lookupField && configuration.lookup) {
      transformed[configuration.lookupField] = configuration.lookup(dataProtection, value);
    }
  }

  return transformed;
};

const rewriteWhere = (
  model: string,
  where: Where[] | undefined,
  dataProtection: DataProtection,
) => {
  if (!where || !isProtectedModel(model)) {
    return where;
  }

  return where.map((condition) => {
    const configuration = protectedFields[model][condition.field];

    if (!configuration) {
      return condition;
    }

    const operator = condition.operator ?? 'eq';

    if (
      !configuration.lookup ||
      !configuration.lookupField ||
      !['eq', 'ne', 'in', 'not_in'].includes(operator) ||
      (condition.mode === 'insensitive' && !configuration.normalizedEquality)
    ) {
      return fail();
    }

    const createLookup = (value: string) => configuration.lookup?.(dataProtection, value) ?? fail();
    let value: Where['value'];

    if (Array.isArray(condition.value)) {
      if (!condition.value.every((item): item is string => typeof item === 'string')) {
        return fail();
      }

      value = condition.value.map(createLookup);
    } else if (condition.value === null) {
      value = null;
    } else if (typeof condition.value === 'string') {
      value = createLookup(condition.value);
    } else {
      return fail();
    }

    return {
      ...condition,
      field: configuration.lookupField,
      mode: 'sensitive' as const,
      value,
    };
  });
};

const rewriteSelect = (model: string, select: string[] | undefined) => {
  if (!select?.length || !isProtectedModel(model)) {
    return { addedId: false, select };
  }

  const containsProtectedField = select.some((field) => protectedFields[model][field]);
  const rewritten = [...select];
  const addedId = containsProtectedField && !select.includes('id');

  if (addedId) {
    rewritten.push('id');
  }

  return { addedId, select: [...new Set(rewritten)] };
};

const decryptRecord = (
  model: ProtectedModel,
  record: Record<string, unknown>,
  dataProtection: DataProtection,
  addedId = false,
) => {
  const decrypted = { ...record };
  const fieldsToRemove = new Set<string>();
  const recordId = typeof record.id === 'string' ? record.id : '';

  for (const [field, configuration] of Object.entries(protectedFields[model])) {
    const ciphertext = record[field];

    if (configuration.lookupField) {
      fieldsToRemove.add(configuration.lookupField);
    }

    if (ciphertext === undefined) {
      if (record[field] !== undefined && record[field] !== null) {
        return fail();
      }

      continue;
    }

    if (ciphertext === null) {
      if (record[field] !== undefined && record[field] !== null) {
        return fail();
      }

      decrypted[field] = null;
    } else {
      if (typeof ciphertext !== 'string' || !recordId) {
        return fail();
      }

      decrypted[field] = dataProtection.decryptValue(ciphertext, configuration.context(recordId));
    }
  }

  if (addedId) {
    fieldsToRemove.add('id');
  }

  return Object.fromEntries(
    Object.entries(decrypted).filter(([field]) => !fieldsToRemove.has(field)),
  );
};

const decryptResult = <Result>(
  model: string,
  result: Result,
  dataProtection: DataProtection,
  join?: JoinOption,
  addedId = false,
): Result => {
  if (result === null) {
    return result;
  }

  const decryptOne = (record: unknown, recordModel: ProtectedModel, removeId = false): unknown => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return fail();
    }

    return decryptRecord(recordModel, record as Record<string, unknown>, dataProtection, removeId);
  };
  const decryptMain = (record: unknown) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return fail();
    }

    const decrypted = (
      isProtectedModel(model)
        ? decryptOne(record, model, addedId)
        : { ...(record as Record<string, unknown>) }
    ) as Record<string, unknown>;

    for (const joinedModel of Object.keys(join ?? {})) {
      if (!isProtectedModel(joinedModel) || decrypted[joinedModel] === undefined) {
        continue;
      }

      const joinedValue = decrypted[joinedModel];

      if (Array.isArray(joinedValue)) {
        decrypted[joinedModel] = joinedValue.map((item) => decryptOne(item, joinedModel));
      } else if (joinedValue === null) {
        decrypted[joinedModel] = null;
      } else {
        decrypted[joinedModel] = decryptOne(joinedValue, joinedModel);
      }
    }

    return decrypted;
  };

  return (Array.isArray(result) ? result.map(decryptMain) : decryptMain(result)) as Result;
};

const rejectProtectedSort = (model: string, field: string | undefined) => {
  if (field && isProtectedModel(model) && protectedFields[model][field]) {
    return fail();
  }
};

const decorateTransactionAdapter = (
  adapter: DBTransactionAdapter,
  options: BetterAuthOptions,
  dataProtection: DataProtection,
): DBTransactionAdapter => ({
  ...adapter,
  consumeOne: <T>(input: { model: string; where: Where[] }): Promise<T | null> =>
    run('consumeOne', async () => {
      const result = await adapter.consumeOne<Record<string, unknown>>({
        ...input,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      });

      return decryptResult(input.model, result, dataProtection) as T | null;
    }),
  count: (input) =>
    run('count', () =>
      adapter.count({
        ...input,
        where: rewriteWhere(input.model, input.where, dataProtection),
      }),
    ),
  create: <T extends Record<string, unknown>, R = T>(input: {
    data: Omit<T, 'id'>;
    forceAllowId?: boolean;
    model: string;
    select?: string[];
  }): Promise<R> =>
    run('create', async () => {
      if (!isProtectedModel(input.model)) {
        return adapter.create<T, R>(input);
      }

      const recordId = createRecordId(
        options,
        input.model,
        input.data as Record<string, unknown>,
        input.forceAllowId ?? false,
      );
      const selection = rewriteSelect(input.model, input.select);
      const result = await adapter.create<Record<string, unknown>, Record<string, unknown>>({
        ...input,
        data: transformWrite(
          input.model,
          { ...input.data, id: recordId },
          recordId,
          dataProtection,
        ),
        forceAllowId: true,
        select: selection.select,
      });

      return decryptResult(input.model, result, dataProtection, undefined, selection.addedId) as R;
    }),
  delete: (input) =>
    run('delete', () =>
      adapter.delete({
        ...input,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      }),
    ),
  deleteMany: (input) =>
    run('deleteMany', () =>
      adapter.deleteMany({
        ...input,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      }),
    ),
  findMany: <T>(input: {
    join?: JoinOption;
    limit?: number;
    model: string;
    offset?: number;
    select?: string[];
    sortBy?: { direction: 'asc' | 'desc'; field: string };
    where?: Where[];
  }): Promise<T[]> =>
    run('findMany', async () => {
      rejectProtectedSort(input.model, input.sortBy?.field);

      const selection = rewriteSelect(input.model, input.select);
      const result = await adapter.findMany<Record<string, unknown>>({
        ...input,
        select: selection.select,
        where: rewriteWhere(input.model, input.where, dataProtection),
      });

      return decryptResult(
        input.model,
        result,
        dataProtection,
        input.join,
        selection.addedId,
      ) as T[];
    }),
  findOne: <T>(input: {
    join?: JoinOption;
    model: string;
    select?: string[];
    where: Where[];
  }): Promise<T | null> =>
    run('findOne', async () => {
      const selection = rewriteSelect(input.model, input.select);
      const result = await adapter.findOne<Record<string, unknown>>({
        ...input,
        select: selection.select,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      });

      return decryptResult(
        input.model,
        result,
        dataProtection,
        input.join,
        selection.addedId,
      ) as T | null;
    }),
  incrementOne: <T>(input: {
    increment: Record<string, number>;
    model: string;
    set?: Record<string, unknown>;
    where: Where[];
  }): Promise<T | null> =>
    run('incrementOne', async () => {
      const modelFields = isProtectedModel(input.model) ? protectedFields[input.model] : undefined;

      if (modelFields && Object.keys(input.increment).some((field) => modelFields[field])) {
        return fail();
      }

      const hasProtectedSet =
        input.set && isProtectedModel(input.model) && hasProtectedValue(input.model, input.set);
      const recordId = hasProtectedSet ? exactRecordId(input.where) : undefined;
      const result = await adapter.incrementOne<Record<string, unknown>>({
        ...input,
        set:
          hasProtectedSet && recordId && isProtectedModel(input.model)
            ? transformWrite(input.model, input.set ?? {}, recordId, dataProtection)
            : input.set,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      });

      return decryptResult(input.model, result, dataProtection) as T | null;
    }),
  update: <T>(input: {
    model: string;
    update: Record<string, unknown>;
    where: Where[];
  }): Promise<T | null> =>
    run('update', async () => {
      const hasProtectedUpdate =
        isProtectedModel(input.model) && hasProtectedValue(input.model, input.update);
      const recordId = hasProtectedUpdate ? exactRecordId(input.where) : undefined;
      const result = await adapter.update<Record<string, unknown>>({
        ...input,
        update:
          hasProtectedUpdate && recordId && isProtectedModel(input.model)
            ? transformWrite(input.model, input.update, recordId, dataProtection)
            : input.update,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      });

      return decryptResult(input.model, result, dataProtection) as T | null;
    }),
  updateMany: (input) =>
    run('updateMany', () => {
      if (isProtectedModel(input.model) && hasProtectedValue(input.model, input.update)) {
        return fail();
      }

      return adapter.updateMany({
        ...input,
        where: rewriteWhere(input.model, input.where, dataProtection) ?? [],
      });
    }),
});

const decorateAdapter = (
  adapter: DBAdapter,
  options: BetterAuthOptions,
  dataProtection: DataProtection,
): DBAdapter => {
  const decorated = decorateTransactionAdapter(adapter, options, dataProtection);

  return {
    ...decorated,
    transaction: (callback) =>
      run('transaction', () =>
        adapter.transaction((transactionAdapter) =>
          callback(decorateTransactionAdapter(transactionAdapter, options, dataProtection)),
        ),
      ),
  };
};

export const protectBetterAuthAdapter =
  (adapterFactory: DBAdapterInstance, dataProtection: DataProtection): DBAdapterInstance =>
  (options) =>
    decorateAdapter(adapterFactory(options), options, dataProtection);
