import type { Task } from '../../types';

export const moveTaskBetweenGroups = (
  tasks: Task[],
  id: string,
  completed: boolean,
  changedOn = Date.now(),
) => {
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return tasks;
  }

  const remainingTasks = tasks.filter((item) => item.id !== id);
  const activeTasks = remainingTasks
    .filter((item) => item.completedAt === null)
    .map((item, position) => ({ ...item, position }));
  const completedTasks = remainingTasks.filter((item) => item.completedAt !== null);

  if (completed) {
    return [...activeTasks, { ...task, changedOn, completedAt: changedOn }, ...completedTasks];
  }

  return [
    { ...task, changedOn, completedAt: null, position: 0 },
    ...activeTasks.map((item) => ({ ...item, position: item.position + 1 })),
    ...completedTasks,
  ];
};
