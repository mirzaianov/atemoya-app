import assert from 'node:assert/strict';
import test from 'node:test';

import { tagSchema } from './tag-schemas.ts';

test('normalizes and validates tag values', () => {
  assert.deepEqual(tagSchema.parse({ color: '#AABBCC', name: ' Work ' }), {
    color: '#aabbcc',
    name: 'work',
  });
  assert.equal(tagSchema.safeParse({ color: '#abc', name: 'work' }).success, false);
  assert.equal(tagSchema.safeParse({ color: '#aabbcc', name: ' ' }).success, false);
  assert.equal(tagSchema.safeParse({ color: '#aabbcc', name: 'x'.repeat(33) }).success, false);
});
