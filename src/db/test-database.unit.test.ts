import assert from 'node:assert/strict';
import test from 'node:test';

import { assertTestDatabaseIdentity, requireTestDatabaseUrl } from './test-database.ts';

test('requires an explicit integration-test database URL', () => {
  assert.throws(
    () => requireTestDatabaseUrl(),
    /TEST_DATABASE_URL is required for integration tests\./u,
  );
  assert.equal(requireTestDatabaseUrl('postgresql://test'), 'postgresql://test');
});

test('accepts only the dedicated integration database and role', () => {
  assert.doesNotThrow(() =>
    assertTestDatabaseIdentity({
      databaseName: 'atemoya_test',
      roleName: 'atemoya_test_owner',
    }),
  );

  for (const identity of [
    undefined,
    { databaseName: 'atemoya', roleName: 'atemoya_test_owner' },
    { databaseName: 'atemoya_test', roleName: 'atemoya_owner' },
  ]) {
    assert.throws(
      () => assertTestDatabaseIdentity(identity),
      /Integration writes require database atemoya_test and role atemoya_test_owner\./u,
    );
  }
});
