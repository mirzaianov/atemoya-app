import assert from 'node:assert/strict';
import test from 'node:test';

import type { Tag, Task } from '../../types.ts';
import {
  filterTasksByTagIds,
  getEligibleFilterTags,
  mergeFilteredTaskOrder,
  normalizeSelectedTagIds,
} from './tag-state.ts';

const tags: Tag[] = [
  { color: '#111111', id: 'work', name: 'work' },
  { color: '#222222', id: 'urgent', name: 'urgent' },
  { color: '#333333', id: 'personal', name: 'personal' },
  { color: '#444444', id: 'unused', name: 'unused' },
];

const task = (id: string, tagIds: string[]): Task => ({
  changedOn: 1,
  completedAt: null,
  id,
  position: 0,
  tags: tagIds.map((tagId) => {
    const tag = tags.find(({ id: candidateId }) => candidateId === tagId);

    assert.ok(tag);

    return tag;
  }),
  title: id,
});

const tasks = [
  task('work', ['work']),
  task('urgent', ['urgent']),
  task('work-urgent', ['work', 'urgent']),
  task('work-urgent-personal', ['work', 'urgent', 'personal']),
  task('untagged', []),
];

test('filters tasks with AND semantics', () => {
  assert.equal(filterTasksByTagIds(tasks, []), tasks);
  assert.deepEqual(
    filterTasksByTagIds(tasks, ['work', 'urgent']).map(({ id }) => id),
    ['work-urgent', 'work-urgent-personal'],
  );
});

test('derives eligible tags and normalizes selected IDs', () => {
  const eligibleTags = getEligibleFilterTags(tags, tasks);

  assert.deepEqual(
    eligibleTags.map(({ id }) => id),
    ['work', 'urgent', 'personal'],
  );
  assert.deepEqual(normalizeSelectedTagIds(['unknown', 'urgent', 'work', 'urgent'], eligibleTags), [
    'urgent',
    'work',
  ]);
  assert.deepEqual(
    normalizeSelectedTagIds(
      Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      Array.from({ length: 11 }, (_, index) => ({
        color: '#111111',
        id: `tag-${index}`,
        name: `tag-${index}`,
      })),
    ),
    Array.from({ length: 10 }, (_, index) => `tag-${index}`),
  );
});

test('merges reordered visible tasks into their original slots', () => {
  const taskA = task('a', []);
  const taskB = task('b', []);
  const taskC = task('c', []);
  const taskD = task('d', []);
  const allTasks = [taskA, taskB, taskC, taskD];
  const visibleTasks = [taskA, taskC];
  const reorderedVisibleTasks = [taskC, taskA];

  assert.deepEqual(
    mergeFilteredTaskOrder(allTasks, visibleTasks, reorderedVisibleTasks).map(({ id }) => id),
    ['c', 'b', 'a', 'd'],
  );
  assert.equal(mergeFilteredTaskOrder(allTasks, visibleTasks, [taskA]), allTasks);
  assert.equal(mergeFilteredTaskOrder(allTasks, visibleTasks, [taskA, taskA]), allTasks);
  assert.equal(
    mergeFilteredTaskOrder(allTasks, visibleTasks, [taskA, task('foreign', [])]),
    allTasks,
  );
});
