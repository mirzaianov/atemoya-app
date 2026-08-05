import assert from 'node:assert/strict';
import test from 'node:test';

import { taskSchema } from './task-schemas.ts';

test('defaults and validates task tag IDs', () => {
  assert.deepEqual(taskSchema.parse({ title: ' Task ' }), { tagIds: [], title: 'Task' });

  const tagId = '2e7f3f76-6af6-4cda-a0b5-b9b7e7d62f0b';

  assert.equal(taskSchema.safeParse({ tagIds: [tagId, tagId], title: 'Task' }).success, false);
  assert.equal(
    taskSchema.safeParse({ tagIds: Array.from({ length: 11 }, () => tagId), title: 'Task' })
      .success,
    false,
  );
  assert.equal(taskSchema.safeParse({ tagIds: ['invalid'], title: 'Task' }).success, false);
});
