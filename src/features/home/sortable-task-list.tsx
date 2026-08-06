'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
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
import { parseAsNativeArrayOf, parseAsString, useQueryState } from 'nuqs';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { toast } from '../../components/toast-provider';
import type { Tag, Task } from '../../types';
import SortableTask from './sortable-task';
import TagFilter from './tag-filter';
import {
  filterTasksByTagIds,
  getEligibleFilterTags,
  mergeFilteredTaskOrder,
  normalizeSelectedTagIds,
} from './tag-state';
import { reorderTasksAction, setTaskCompletedAction } from './task-actions';
import TaskEditDialog from './task-edit-dialog';
import TaskRow, { TaskDragPreview } from './task-row';
import { moveTaskBetweenGroups } from './task-state';

import listStyles from './task-list.module.css';

interface SortableTaskListProps {
  availableTags: Tag[];
  tasks: Task[];
}

interface TaskGroupProps {
  children: ReactNode;
  count: ReactNode;
  defaultOpen?: boolean;
  label: string;
}

const tagParser = parseAsNativeArrayOf(parseAsString).withDefault([]).withOptions({
  history: 'replace',
  scroll: false,
  shallow: true,
});

const TaskGroup = ({ children, count, defaultOpen = false, label }: TaskGroupProps) => (
  <Collapsible.Root className={listStyles.group} defaultOpen={defaultOpen}>
    <h2 className={listStyles.groupHeading}>
      <Collapsible.Trigger className={listStyles.groupTrigger}>
        <ChevronRight aria-hidden="true" className={listStyles.groupChevron} size={18} />
        <span>{label}</span>
        <span aria-hidden="true">&middot;</span>
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

export default function SortableTaskList({ availableTags, tasks }: SortableTaskListProps) {
  const router = useRouter();
  const [rawTagIds, setTagIds] = useQueryState('tag', tagParser);
  const [previousInputTasks, setPreviousInputTasks] = useState(tasks);
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const reducedMotion = useReducedMotion();
  const isDragging = activeTask !== null;
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
  const eligibleTags = useMemo(
    () => getEligibleFilterTags(availableTags, orderedTasks),
    [availableTags, orderedTasks],
  );
  const selectedTagIds = useMemo(
    () => normalizeSelectedTagIds(rawTagIds, eligibleTags),
    [eligibleTags, rawTagIds],
  );
  const visibleActiveTasks = filterTasksByTagIds(activeTasks, selectedTagIds);
  const visibleCompletedTasks = filterTasksByTagIds(completedTasks, selectedTagIds);
  const hasFilters = selectedTagIds.length > 0;
  const hasNoMatches =
    hasFilters && visibleActiveTasks.length === 0 && visibleCompletedTasks.length === 0;

  useEffect(() => {
    const isCanonical =
      rawTagIds.length === selectedTagIds.length &&
      rawTagIds.every((id, index) => id === selectedTagIds[index]);

    if (!isCanonical) {
      void setTagIds(selectedTagIds);
    }
  }, [rawTagIds, selectedTagIds, setTagIds]);

  const handleCompletedChange = (task: Task, completed: boolean) => {
    const previousOrder = orderedTasks;

    setOrderedTasks(moveTaskBetweenGroups(orderedTasks, task.id, completed));
    completionMutation.mutate({ completed, id: task.id, previousTasks: previousOrder });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleActiveTasks.findIndex((task) => task.id === active.id);
    const newIndex = visibleActiveTasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousOrder = orderedTasks;
    const reorderedVisibleTasks = arrayMove(visibleActiveTasks, oldIndex, newIndex);
    const nextTasks = mergeFilteredTaskOrder(
      activeTasks,
      visibleActiveTasks,
      reorderedVisibleTasks,
    );

    setOrderedTasks([...nextTasks, ...completedTasks]);
    reorderMutation.mutate({ nextTasks, previousTasks: previousOrder });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(visibleActiveTasks.find((task) => task.id === event.active.id) ?? null);
  };

  return (
    <>
      <TagFilter
        allTags={availableTags}
        onChange={(tagIds) => void setTagIds(tagIds)}
        tags={eligibleTags}
        value={selectedTagIds}
      />
      {hasNoMatches ? (
        <div className={listStyles.noMatches}>
          <p>No tasks match all selected tags.</p>
          <button
            className={listStyles.clearFilters}
            onClick={() => void setTagIds([])}
            type="button"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={listStyles.groups}>
          <TaskGroup
            count={
              hasFilters
                ? `${visibleActiveTasks.length} of ${activeTasks.length}`
                : activeTasks.length
            }
            defaultOpen
            label="Active"
          >
            <DndContext
              collisionDetection={closestCenter}
              id="task-list-sortable"
              modifiers={[restrictToVerticalAxis]}
              onDragCancel={() => setActiveTask(null)}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              sensors={sensors}
            >
              <SortableContext
                items={visibleActiveTasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className={clsx(listStyles.tasks, isDragging && listStyles.dragging)}>
                  {visibleActiveTasks.map((task) => (
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
              <DragOverlay
                adjustScale={false}
                dropAnimation={reducedMotion ? null : undefined}
                zIndex={10}
              >
                {activeTask ? <TaskDragPreview task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </TaskGroup>
          <TaskGroup
            count={
              hasFilters
                ? `${visibleCompletedTasks.length} of ${completedTasks.length}`
                : completedTasks.length
            }
            defaultOpen
            label="Completed"
          >
            <ul className={listStyles.tasks}>
              {visibleCompletedTasks.map((task) => (
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
        </div>
      )}
      <TaskEditDialog
        editingTask={editingTask}
        onClose={() => setEditingTask(null)}
        tags={availableTags}
      />
    </>
  );
}
