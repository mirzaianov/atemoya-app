import assert from 'node:assert/strict';
import test from 'node:test';

import { createDataProtectionFromEnvironment } from './data-protection-config.ts';
import { DataProtectionError } from './data-protection.ts';

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64url');

const environment = {
  BLIND_INDEX_ACTIVE_VERSION: '1',
  BLIND_INDEX_KEYS: JSON.stringify({ 1: key(2) }),
  DATA_ENCRYPTION_ACTIVE_VERSION: '1',
  DATA_ENCRYPTION_KEYS: JSON.stringify({ 1: key(1) }),
};

test('creates data protection from the environment contract', () => {
  const protection = createDataProtectionFromEnvironment(environment);
  const context = { field: 'title', model: 'tasks', recordId: 'task-1' } as const;
  const envelope = protection.encryptValue('Configured task', context);

  assert.equal(protection.decryptValue(envelope, context), 'Configured task');
});

test('fails closed for invalid environment configuration', () => {
  for (const invalidEnvironment of [
    { ...environment, DATA_ENCRYPTION_KEYS: undefined },
    { ...environment, BLIND_INDEX_KEYS: '{' },
    { ...environment, BLIND_INDEX_KEYS: environment.DATA_ENCRYPTION_KEYS },
    { ...environment, DATA_ENCRYPTION_ACTIVE_VERSION: '2' },
  ]) {
    let thrownError: unknown;

    try {
      createDataProtectionFromEnvironment(invalidEnvironment);
    } catch (error) {
      thrownError = error;
    }

    assert.ok(thrownError instanceof DataProtectionError);
    assert.equal(thrownError.code, 'INVALID_CONFIGURATION');
    assert.equal(thrownError.message, 'INVALID_CONFIGURATION');
    assert.equal('cause' in thrownError, false);
  }
});
