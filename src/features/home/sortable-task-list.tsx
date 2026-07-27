'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { toast } from '../../components/toast-provider';
import type { Task } from '../../types';
import SortableTask from './sortable-task';
import { reorderTasksAction, setTaskCompletedAction } from './task-actions';
import TaskEditDialog from './task-edit-dialog';
import TaskRow from './task-row';
import { moveTaskBetweenGroups } from './task-state';

import listStyles from './task-list.module.css';

interface SortableTaskListProps {
  tasks: Task[];
}

interface TaskGroupProps {
  children: ReactNode;
  count: number;
  defaultOpen?: boolean;
  label: string;
}

const TaskGroup = ({ children, count, defaultOpen = false, label }: TaskGroupProps) => (
  <Collapsible.Root className={listStyles.group} defaultOpen={defaultOpen}>
    <h2 className={listStyles.groupHeading}>
      <Collapsible.Trigger className={listStyles.groupTrigger}>
        <ChevronRight aria-hidden="true" className={listStyles.groupChevron} size={18} />
        <span>{label}</span>
        <span className={listStyles.groupCount}>{count}</span>
      </Collapsible.Trigger>
    </h2>
    <Collapsible.Panel className={listStyles.groupPanel}>{children}</Collapsible.Panel>
  </Collapsible.Root>
);

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReducedMotion(media.matches);

    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);

    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  return reducedMotion;
};

export default function SortableTaskList({ tasks }: SortableTaskListProps) {
  const router = useRouter();
  const [previousInputTasks, setPreviousInputTasks] = useState(tasks);
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const reducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reorderMutation = useMutation({
    mutationFn: ({ nextTasks }: { nextTasks: Task[]; previousTasks: Task[] }) =>
      reorderTasksAction(nextTasks.map((task) => task.id)),
    onError: (_error, { previousTasks: previousOrder }) => {
      setOrderedTasks(previousOrder);
      toast.error('Task order could not be saved. Please refresh and try again.');
    },
    onSuccess: (result, { previousTasks: previousOrder }) => {
      if (result.error) {
        setOrderedTasks(previousOrder);
        toast.error(result.error);
      }
    },
  });
  const completionMutation = useMutation({
    mutationFn: ({ completed, id }: { completed: boolean; id: string; previousTasks: Task[] }) =>
      setTaskCompletedAction(id, completed),
    onError: (_error, { previousTasks }) => {
      setOrderedTasks(previousTasks);
      toast.error('Task could not be updated. Please refresh and try again.');
    },
    onSuccess: (result, { completed, previousTasks }) => {
      if (result.error) {
        setOrderedTasks(previousTasks);
        toast.error(result.error);

        return;
      }

      toast.success(completed ? 'Task completed' : 'Task restored');
      router.refresh();
    },
  });

  if (tasks !== previousInputTasks) {
    setPreviousInputTasks(tasks);
    setOrderedTasks(tasks);
  }

  const activeTasks = orderedTasks.filter((task) => task.completedAt === null);
  const completedTasks = orderedTasks.filter((task) => task.completedAt !== null);

  const handleCompletedChange = (task: Task, completed: boolean) => {
    const previousOrder = orderedTasks;

    setOrderedTasks(moveTaskBetweenGroups(orderedTasks, task.id, completed));
    completionMutation.mutate({ completed, id: task.id, previousTasks: previousOrder });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeTasks.findIndex((task) => task.id === active.id);
    const newIndex = activeTasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousOrder = orderedTasks;
    const nextTasks = arrayMove(activeTasks, oldIndex, newIndex);

    setOrderedTasks([...nextTasks, ...completedTasks]);
    reorderMutation.mutate({ nextTasks, previousTasks: previousOrder });
  };

  return (
    <>
      <div className={listStyles.groups}>
        <TaskGroup count={activeTasks.length} defaultOpen label="Active">
          <DndContext
            collisionDetection={closestCenter}
            id="task-list-sortable"
            modifiers={[restrictToVerticalAxis]}
            onDragCancel={() => setIsDragging(false)}
            onDragEnd={handleDragEnd}
            onDragStart={() => setIsDragging(true)}
            sensors={sensors}
          >
            <SortableContext
              items={activeTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className={clsx(listStyles.tasks, isDragging && listStyles.dragging)}>
                {activeTasks.map((task) => (
                  <SortableTask
                    completionDisabled={completionMutation.isPending}
                    key={task.id}
                    onCompletedChange={handleCompletedChange}
                    onEdit={setEditingTask}
                    reducedMotion={reducedMotion}
                    task={task}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </TaskGroup>
        {completedTasks.length > 0 ? (
          <TaskGroup count={completedTasks.length} label="Completed">
            <ul className={listStyles.tasks}>
              {completedTasks.map((task) => (
                <TaskRow
                  completionDisabled={completionMutation.isPending}
                  key={task.id}
                  onCompletedChange={handleCompletedChange}
                  onEdit={setEditingTask}
                  task={task}
                />
              ))}
            </ul>
          </TaskGroup>
        ) : null}
      </div>
      <TaskEditDialog editingTask={editingTask} onClose={() => setEditingTask(null)} />
    </>
  );
}
