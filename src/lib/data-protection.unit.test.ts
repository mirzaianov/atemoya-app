import assert from 'node:assert/strict';
import test from 'node:test';

import { createDataProtection, DataProtectionError } from './data-protection.ts';
import type { EncryptionContext } from './data-protection.ts';

/* oxlint-disable promise/prefer-await-to-callbacks -- node:assert requires synchronous callbacks. */

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');

const configuration = {
  blindIndexActiveVersion: '1',
  blindIndexKeys: JSON.stringify({ 1: key(2) }),
  dataEncryptionActiveVersion: '1',
  dataEncryptionKeys: JSON.stringify({ 1: key(1) }),
};

const taskContext: EncryptionContext = {
  field: 'title',
  model: 'tasks',
  recordId: 'task-1',
};

const expectCode = (code: DataProtectionError['code'], action: () => unknown) => {
  assert.throws(action, (error) => {
    assert.ok(error instanceof DataProtectionError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);

    return true;
  });
};

test('rejects invalid or reused key configuration', () => {
  for (const invalidConfiguration of [
    {},
    { ...configuration, dataEncryptionKeys: '{' },
    { ...configuration, dataEncryptionKeys: '[]' },
    { ...configuration, dataEncryptionKeys: '{}' },
    { ...configuration, dataEncryptionKeys: JSON.stringify({ 0: key(1) }) },
    { ...configuration, dataEncryptionKeys: JSON.stringify({ 1: 'not-base64url!' }) },
    { ...configuration, dataEncryptionKeys: JSON.stringify({ 1: key(1).slice(1) }) },
    { ...configuration, dataEncryptionActiveVersion: '2' },
    { ...configuration, dataEncryptionActiveVersion: '01' },
    { ...configuration, blindIndexKeys: configuration.dataEncryptionKeys },
  ]) {
    expectCode('INVALID_CONFIGURATION', () => createDataProtection(invalidConfiguration));
  }
});

test('encrypts with fresh IVs and decrypts with record-bound context', () => {
  const protection = createDataProtection(configuration);
  const first = protection.encryptValue('Sensitive task', taskContext);
  const second = protection.encryptValue('Sensitive task', taskContext);

  assert.notEqual(first, second);
  assert.match(first, /^enc:v1:1:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]+$/u);
  assert.equal(protection.decryptValue(first, taskContext), 'Sensitive task');
  assert.equal(protection.decryptValue(protection.encryptValue('', taskContext), taskContext), '');

  for (const context of [
    { ...taskContext, field: 'email', model: 'user' } as EncryptionContext,
    { ...taskContext, recordId: 'task-2' },
  ]) {
    expectCode('DECRYPTION_FAILED', () => protection.decryptValue(first, context));
  }

  expectCode('INVALID_CONTEXT', () =>
    protection.encryptValue('Sensitive task', { ...taskContext, recordId: '' }),
  );
});

test('rejects malformed, unknown, and tampered envelopes without leaking values', () => {
  const protection = createDataProtection(configuration);
  const plaintext = 'DO_NOT_LEAK_THIS_VALUE';
  const envelope = protection.encryptValue(plaintext, taskContext);
  const parts = envelope.split(':');
  const tamperedTag = Buffer.from(parts[4] ?? '', 'base64url');

  tamperedTag[0] = ((tamperedTag[0] ?? 0) + 1) % 256;

  for (const [code, value] of [
    ['MALFORMED_ENVELOPE', 'not-an-envelope'],
    ['MALFORMED_ENVELOPE', envelope.replace('enc:v1', 'enc:v2')],
    ['MALFORMED_ENVELOPE', envelope.replace(parts[3] ?? '', 'invalid!')],
    ['UNKNOWN_KEY_VERSION', envelope.replace('enc:v1:1:', 'enc:v1:2:')],
    [
      'DECRYPTION_FAILED',
      [...parts.slice(0, 4), tamperedTag.toString('base64url'), ...parts.slice(5)].join(':'),
    ],
  ] as const) {
    expectCode(code, () => protection.decryptValue(value, taskContext));

    try {
      protection.decryptValue(value, taskContext);
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /DO_NOT_LEAK_THIS_VALUE/u);
      assert.equal('cause' in error, false);
    }
  }
});

test('decrypts retained key versions while new writes use only the active version', () => {
  const versionOne = createDataProtection(configuration);
  const oldEnvelope = versionOne.encryptValue('old value', taskContext);
  const rotated = createDataProtection({
    ...configuration,
    dataEncryptionActiveVersion: '2',
    dataEncryptionKeys: JSON.stringify({ 1: key(1), 2: key(3) }),
  });

  assert.equal(rotated.decryptValue(oldEnvelope, taskContext), 'old value');
  assert.match(rotated.encryptValue('new value', taskContext), /^enc:v1:2:/u);
  expectCode('DECRYPTION_FAILED', () =>
    createDataProtection({
      ...configuration,
      dataEncryptionKeys: JSON.stringify({ 1: key(4) }),
    }).decryptValue(oldEnvelope, taskContext),
  );
});

test('creates stable domain-separated blind indexes with approved normalization', () => {
  const protection = createDataProtection(configuration);

  assert.equal(
    protection.emailLookup('  USER@Example.COM '),
    protection.emailLookup('user@example.com'),
  );
  assert.equal(protection.nicknameLookup('  valid_name '), protection.nicknameLookup('valid_name'));
  expectCode('INVALID_LOOKUP_VALUE', () => protection.nicknameLookup('Invalid Name'));

  assert.equal(
    protection.taskTitleLookup('user-1', '  ÄPFEL '),
    protection.taskTitleLookup('user-1', 'äpfel'),
  );
  assert.notEqual(
    protection.taskTitleLookup('user-1', 'Task'),
    protection.taskTitleLookup('user-2', 'Task'),
  );
  expectCode('INVALID_LOOKUP_VALUE', () => protection.taskTitleLookup('', 'Task'));

  assert.equal(protection.sessionTokenLookup('Token'), protection.sessionTokenLookup('Token'));
  assert.notEqual(protection.sessionTokenLookup('Token'), protection.sessionTokenLookup('token'));
  assert.notEqual(
    protection.sessionTokenLookup('same-value'),
    protection.verificationIdentifierLookup('same-value'),
  );

  const rotated = createDataProtection({
    ...configuration,
    blindIndexActiveVersion: '2',
    blindIndexKeys: JSON.stringify({ 1: key(2), 2: key(4) }),
  });

  assert.notEqual(
    rotated.emailLookup('user@example.com'),
    protection.emailLookup('user@example.com'),
  );
});
