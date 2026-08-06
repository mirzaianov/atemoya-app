import type { Tag, Task } from '../../types';

const maxSelectedTags = 10;

export const filterTasksByTagIds = (tasks: Task[], selectedTagIds: string[]) => {
  if (selectedTagIds.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => {
    const taskTagIds = new Set(task.tags.map(({ id }) => id));

    return selectedTagIds.every((id) => taskTagIds.has(id));
  });
};

export const getEligibleFilterTags = (tags: Tag[], tasks: Task[]) => {
  const assignedTagIds = new Set(tasks.flatMap((task) => task.tags.map(({ id }) => id)));

  return tags.filter(({ id }) => assignedTagIds.has(id));
};

export const normalizeSelectedTagIds = (selectedTagIds: string[], eligibleTags: Tag[]) => {
  const eligibleTagIds = new Set(eligibleTags.map(({ id }) => id));

  return [...new Set(selectedTagIds)]
    .filter((id) => eligibleTagIds.has(id))
    .slice(0, maxSelectedTags);
};

export const mergeFilteredTaskOrder = (
  allActiveTasks: Task[],
  visibleTasks: Task[],
  reorderedVisibleTasks: Task[],
) => {
  if (visibleTasks.length === 0 || visibleTasks.length !== reorderedVisibleTasks.length) {
    return allActiveTasks;
  }

  const allIds = new Set(allActiveTasks.map(({ id }) => id));
  const visibleIds = new Set(visibleTasks.map(({ id }) => id));
  const reorderedIds = new Set(reorderedVisibleTasks.map(({ id }) => id));
  const membershipIsValid =
    allIds.size === allActiveTasks.length &&
    visibleIds.size === visibleTasks.length &&
    reorderedIds.size === reorderedVisibleTasks.length &&
    [...visibleIds].every((id) => allIds.has(id)) &&
    [...reorderedIds].every((id) => visibleIds.has(id));

  if (!membershipIsValid) {
    return allActiveTasks;
  }

  let visibleIndex = 0;

  return allActiveTasks.map((task) => {
    if (!visibleIds.has(task.id)) {
      return task;
    }

    const reorderedTask = reorderedVisibleTasks[visibleIndex];

    visibleIndex += 1;

    return reorderedTask ?? task;
  });
};
