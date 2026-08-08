import assert from 'node:assert/strict';
import test from 'node:test';

import type { Task } from '../../types';
import {
  insertConfirmedTask,
  moveTaskBetweenGroups,
  removeConfirmedTask,
  replaceConfirmedTask,
} from './task-state.ts';

const tasks: Task[] = [
  {
    changedOn: 1,
    completedAt: null,
    id: 'active-1',
    position: 0,
    tags: [{ color: '#111111', id: 'work', name: 'work' }],
    title: 'First',
  },
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
  assert.deepEqual(
    completed.find(({ id }) => id === 'active-1')?.tags.map(({ id }) => id),
    ['work'],
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

test('commits confirmed task creation, edition, and deletion', () => {
  const created: Task = {
    changedOn: 4,
    completedAt: null,
    id: 'active-3',
    position: 0,
    tags: [],
    title: 'Created',
  };
  const afterCreate = insertConfirmedTask(tasks, created);

  assert.deepEqual(
    afterCreate.map(({ id, position }) => ({ id, position })),
    [
      { id: 'active-3', position: 0 },
      { id: 'active-1', position: 1 },
      { id: 'active-2', position: 2 },
      { id: 'completed-1', position: 0 },
    ],
  );

  const edited = { ...tasks[1], tags: tasks[0].tags, title: 'Edited' };
  const afterEdit = replaceConfirmedTask(tasks, edited);

  assert.equal(afterEdit[1], edited);
  assert.deepEqual(
    afterEdit.map(({ id }) => id),
    tasks.map(({ id }) => id),
  );
  assert.deepEqual(
    removeConfirmedTask(tasks, 'active-2').map(({ id }) => id),
    ['active-1', 'completed-1'],
  );
});
