import assert from 'node:assert/strict';
import test from 'node:test';

import type { Task } from '../../types';
import { moveTaskBetweenGroups } from './task-state.ts';

const tasks: Task[] = [
  { changedOn: 1, completedAt: null, id: 'active-1', position: 0, tags: [], title: 'First' },
  { changedOn: 2, completedAt: null, id: 'active-2', position: 1, tags: [], title: 'Second' },
  { changedOn: 3, completedAt: 3, id: 'completed-1', position: 0, tags: [], title: 'Done' },
];

test('moves tasks between active and completed groups', () => {
  const completed = moveTaskBetweenGroups(tasks, 'active-1', true, 10);

  assert.deepEqual(
    completed.map(({ completedAt, id, position }) => ({ completedAt, id, position })),
    [
      { completedAt: null, id: 'active-2', position: 0 },
      { completedAt: 10, id: 'active-1', position: 0 },
      { completedAt: 3, id: 'completed-1', position: 0 },
    ],
  );

  const restored = moveTaskBetweenGroups(completed, 'completed-1', false, 11);

  assert.deepEqual(
    restored.map(({ completedAt, id, position }) => ({ completedAt, id, position })),
    [
      { completedAt: null, id: 'completed-1', position: 0 },
      { completedAt: null, id: 'active-2', position: 1 },
      { completedAt: 10, id: 'active-1', position: 0 },
    ],
  );
});
