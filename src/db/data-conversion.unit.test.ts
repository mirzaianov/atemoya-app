import assert from 'node:assert/strict';
import test from 'node:test';

import { assertConversionIntent, DataConversionError } from './data-conversion.ts';

test('requires an exact conversion target confirmation', () => {
  assert.equal(assertConversionIntent('test', 'CONVERT-ATEMOYA-TEST'), 'test');
  assert.equal(assertConversionIntent('development', 'CONVERT-DEVELOPMENT-DATA'), 'development');
  assert.equal(assertConversionIntent('production', 'CONVERT-PRODUCTION-DATA'), 'production');

  for (const [target, confirmation] of [
    [undefined, undefined],
    ['preview', 'CONVERT-DEVELOPMENT-DATA'],
    ['production', 'CONVERT-DEVELOPMENT-DATA'],
  ]) {
    assert.throws(() => assertConversionIntent(target, confirmation), DataConversionError);
  }
});
