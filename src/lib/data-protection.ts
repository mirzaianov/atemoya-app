import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { nicknameSchema } from './auth-nickname.ts';

const algorithm = 'aes-256-gcm';
const authenticationTagLength = 16;
const envelopePrefix = 'enc:v1';
const initializationVectorLength = 12;
const keyLength = 32;
const versionPattern = /^[1-9]\d*$/u;

const protectedFields = {
  session: new Set(['ipAddress', 'token', 'userAgent']),
  tags: new Set(['name']),
  tasks: new Set(['title']),
  user: new Set(['email', 'image', 'name']),
  verification: new Set(['identifier', 'value']),
} as const;

export type EncryptionContext =
  | { field: 'ipAddress' | 'token' | 'userAgent'; model: 'session'; recordId: string }
  | { field: 'name'; model: 'tags'; recordId: string }
  | { field: 'title'; model: 'tasks'; recordId: string }
  | { field: 'email' | 'image' | 'name'; model: 'user'; recordId: string }
  | { field: 'identifier' | 'value'; model: 'verification'; recordId: string };

export type DataProtectionErrorCode =
  | 'DECRYPTION_FAILED'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_CONTEXT'
  | 'INVALID_LOOKUP_VALUE'
  | 'MALFORMED_ENVELOPE'
  | 'UNKNOWN_KEY_VERSION';

export class DataProtectionError extends Error {
  readonly code: DataProtectionErrorCode;

  constructor(code: DataProtectionErrorCode) {
    super(code);
    this.code = code;
    this.name = 'DataProtectionError';
  }
}

interface DataProtectionConfiguration {
  blindIndexActiveVersion?: string;
  blindIndexKeys?: string;
  dataEncryptionActiveVersion?: string;
  dataEncryptionKeys?: string;
}

const fail = (code: DataProtectionErrorCode): never => {
  throw new DataProtectionError(code);
};

const parseVersion = (value: string | undefined) => {
  if (!value || !versionPattern.test(value)) {
    return fail('INVALID_CONFIGURATION');
  }

  const version = Number(value);

  if (!Number.isSafeInteger(version)) {
    return fail('INVALID_CONFIGURATION');
  }

  return version;
};

const parseKeyring = (serializedKeyring: string | undefined) => {
  if (!serializedKeyring) {
    return fail('INVALID_CONFIGURATION');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedKeyring);
  } catch {
    return fail('INVALID_CONFIGURATION');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('INVALID_CONFIGURATION');
  }

  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    return fail('INVALID_CONFIGURATION');
  }

  const keyring = new Map<number, Buffer>();

  for (const [serializedVersion, serializedKey] of entries) {
    const version = parseVersion(serializedVersion);

    if (typeof serializedKey !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(serializedKey)) {
      return fail('INVALID_CONFIGURATION');
    }

    const key = Buffer.from(serializedKey, 'base64url');

    if (key.length !== keyLength || key.toString('base64url') !== serializedKey) {
      return fail('INVALID_CONFIGURATION');
    }

    keyring.set(version, key);
  }

  return keyring;
};

const getActiveKey = (keyring: Map<number, Buffer>, version: number) => {
  const key = keyring.get(version);

  if (!key) {
    return fail('INVALID_CONFIGURATION');
  }

  return key;
};

const validateContext = (context: EncryptionContext) => {
  if (
    !context.recordId ||
    context.recordId.includes('\0') ||
    !protectedFields[context.model]?.has(context.field)
  ) {
    return fail('INVALID_CONTEXT');
  }
};

const createAdditionalData = (context: EncryptionContext) =>
  Buffer.from(`atemoya:data:v1\0${context.model}\0${context.field}\0${context.recordId}`, 'utf-8');

const decodeEnvelopePart = (value: string, length?: number) => {
  if (value !== '' && !/^[A-Za-z0-9_-]+$/u.test(value)) {
    return fail('MALFORMED_ENVELOPE');
  }

  const decoded = Buffer.from(value, 'base64url');

  if (
    decoded.toString('base64url') !== value ||
    (length !== undefined && decoded.length !== length)
  ) {
    return fail('MALFORMED_ENVELOPE');
  }

  return decoded;
};

export const createDataProtection = (configuration: DataProtectionConfiguration) => {
  const dataEncryptionKeys = parseKeyring(configuration.dataEncryptionKeys);
  const blindIndexKeys = parseKeyring(configuration.blindIndexKeys);
  const dataEncryptionActiveVersion = parseVersion(configuration.dataEncryptionActiveVersion);
  const blindIndexActiveVersion = parseVersion(configuration.blindIndexActiveVersion);
  const dataEncryptionKey = getActiveKey(dataEncryptionKeys, dataEncryptionActiveVersion);
  const blindIndexKey = getActiveKey(blindIndexKeys, blindIndexActiveVersion);

  for (const encryptionKey of dataEncryptionKeys.values()) {
    for (const lookupKey of blindIndexKeys.values()) {
      if (timingSafeEqual(encryptionKey, lookupKey)) {
        return fail('INVALID_CONFIGURATION');
      }
    }
  }

  const createLookup = (
    model: string,
    field: string,
    normalizer: string,
    value: string,
    ownerId = '',
  ) =>
    createHmac('sha256', blindIndexKey)
      .update(`atemoya:lookup:v1\0${model}\0${field}\0${normalizer}\0${ownerId}\0${value}`, 'utf-8')
      .digest('base64url');

  return Object.freeze({
    decryptValue: (envelope: string, context: EncryptionContext) => {
      validateContext(context);

      const parts = envelope.split(':');

      if (parts.length !== 6 || `${parts[0]}:${parts[1]}` !== envelopePrefix) {
        return fail('MALFORMED_ENVELOPE');
      }

      const [serializedKeyVersion, serializedIv, serializedTag, serializedValue] = parts.slice(2);

      if (!versionPattern.test(serializedKeyVersion)) {
        return fail('MALFORMED_ENVELOPE');
      }

      const keyVersion = Number(serializedKeyVersion);
      const key = dataEncryptionKeys.get(keyVersion);

      if (!key) {
        return fail('UNKNOWN_KEY_VERSION');
      }

      const iv = decodeEnvelopePart(serializedIv, initializationVectorLength);
      const tag = decodeEnvelopePart(serializedTag, authenticationTagLength);
      const encryptedValue = decodeEnvelopePart(serializedValue);

      try {
        const decipher = createDecipheriv(algorithm, key, iv, {
          authTagLength: authenticationTagLength,
        });

        decipher.setAAD(createAdditionalData(context));
        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(encryptedValue), decipher.final()]).toString('utf-8');
      } catch {
        return fail('DECRYPTION_FAILED');
      }
    },
    emailLookup: (email: string) =>
      createLookup('user', 'email', 'email:v1', email.trim().toLowerCase()),
    encryptValue: (value: string, context: EncryptionContext) => {
      validateContext(context);

      const iv = randomBytes(initializationVectorLength);
      const cipher = createCipheriv(algorithm, dataEncryptionKey, iv, {
        authTagLength: authenticationTagLength,
      });

      cipher.setAAD(createAdditionalData(context));

      const encryptedValue = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return [
        envelopePrefix,
        dataEncryptionActiveVersion,
        iv.toString('base64url'),
        tag.toString('base64url'),
        encryptedValue.toString('base64url'),
      ].join(':');
    },
    nicknameLookup: (nickname: string) => {
      const parsed = nicknameSchema.safeParse(nickname);

      if (!parsed.success) {
        return fail('INVALID_LOOKUP_VALUE');
      }

      return createLookup('user', 'name', 'nickname:v1', parsed.data);
    },
    sessionTokenLookup: (token: string) => createLookup('session', 'token', 'exact:v1', token),
    tagNameLookup: (userId: string, name: string) => {
      if (!userId || userId.includes('\0')) {
        return fail('INVALID_LOOKUP_VALUE');
      }

      return createLookup('tags', 'name', 'tag-name:v1', name.trim().toLowerCase(), userId);
    },
    taskTitleLookup: (userId: string, title: string) => {
      if (!userId || userId.includes('\0')) {
        return fail('INVALID_LOOKUP_VALUE');
      }

      return createLookup('tasks', 'title', 'task-title:v1', title.trim().toLowerCase(), userId);
    },
    verificationIdentifierLookup: (identifier: string) =>
      createLookup('verification', 'identifier', 'exact:v1', identifier),
  });
};
