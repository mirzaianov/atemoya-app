import type { Tag, Task } from '../../types';
import SortableTaskList from './sortable-task-list';

interface TaskListProps {
  tags: Tag[];
  tasks: Task[];
}

export default function TaskList({ tags, tasks }: TaskListProps) {
  return <SortableTaskList availableTags={tags} tasks={tasks} />;
}
