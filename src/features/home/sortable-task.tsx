'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

import type { Task } from '../../types';
import TaskRow from './task-row';

const dragTransition = {
  duration: 260,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
const noMotionTransition = {
  duration: 0,
  easing: 'linear',
};
const visualTransition =
  'background-color 180ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)';

interface SortableTaskProps {
  completionDisabled: boolean;
  onCompletedChange: (task: Task, completed: boolean) => void;
  onEdit: (task: Task) => void;
  reducedMotion: boolean;
  task: Task;
}

export default function SortableTask({
  completionDisabled,
  onCompletedChange,
  onEdit,
  reducedMotion,
  task,
}: SortableTaskProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: task.id,
    transition: reducedMotion ? noMotionTransition : dragTransition,
  });
  const dragTransform = CSS.Translate.toString(transform);
  const taskTransition = [transition, reducedMotion ? undefined : visualTransition]
    .filter(Boolean)
    .join(', ');
  const style: CSSProperties = {
    transform: dragTransform,
    transition: taskTransition || undefined,
  };

  return (
    <TaskRow
      completionDisabled={completionDisabled}
      draggable
      dragHandleProps={{ ...attributes, ...listeners }}
      dragHandleRef={setActivatorNodeRef}
      isDragging={isDragging}
      onCompletedChange={onCompletedChange}
      onEdit={onEdit}
      rowRef={setNodeRef}
      style={style}
      task={task}
    />
  );
}
