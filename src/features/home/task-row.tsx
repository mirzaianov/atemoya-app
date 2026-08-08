'use client';

import { Checkbox } from '@base-ui/react/checkbox';
import { Menu } from '@base-ui/react/menu';
import { Popover } from '@base-ui/react/popover';
import clsx from 'clsx';
import { Check, EllipsisVertical, FilePen, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

import IconTooltip from '../../components/icon-tooltip';
import type { Task } from '../../types';
import TagChip from './tag-chip';
import TaskDeleteDialog from './task-delete-dialog';

import buttonStyles from '../../components/button.module.css';
import popupStyles from '../../styles/popup.module.css';
import tagStyles from './tag.module.css';
import styles from './task.module.css';

const actionIconSize = 20;
const checkIconSize = 14;

const TaskTags = ({ interactive = true, task }: { interactive?: boolean; task: Task }) => {
  const tags = useMemo(
    // oxlint-disable-next-line unicorn/no-array-sort -- ES2022 lacks Array.toSorted; this is a copy.
    () => [...task.tags].sort((left, right) => left.name.localeCompare(right.name)),
    [task.tags],
  );
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const measurementRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const resolvedVisibleCount = Math.min(visibleCount, tags.length);
  const visibleTags = tags.slice(0, resolvedVisibleCount);
  const remainingTags = tags.slice(resolvedVisibleCount);

  useEffect(() => {
    const measurement = measurementRef.current;
    const row = rowRef.current;

    if (!(measurement && row)) {
      return;
    }

    const updateVisibleCount = () => {
      const measurements = [...measurement.children].map(
        (element) => (element as HTMLElement).getBoundingClientRect().width,
      );
      const tagWidths = measurements.slice(0, tags.length);
      const overflowWidths = measurements.slice(tags.length);
      const gap = Number(getComputedStyle(row).columnGap) || 0;
      const availableWidth = row.clientWidth;
      const allTagsWidth =
        tagWidths.reduce((total, width) => total + width, 0) + Math.max(0, tags.length - 1) * gap;
      let nextVisibleCount = tags.length;

      if (allTagsWidth > availableWidth) {
        nextVisibleCount = 0;

        let visibleWidth = 0;

        for (const [index, tagWidth] of tagWidths.entries()) {
          visibleWidth += (index === 0 ? 0 : gap) + tagWidth;

          const proposedVisibleCount = index + 1;
          const hiddenCount = tags.length - proposedVisibleCount;

          if (hiddenCount === 0) {
            break;
          }

          const overflowWidth = overflowWidths[hiddenCount - 1] ?? 0;
          const proposedWidth = visibleWidth + gap + overflowWidth;

          if (proposedWidth <= availableWidth) {
            nextVisibleCount = proposedVisibleCount;
          }
        }
      }

      setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));
    };

    updateVisibleCount();

    const resizeObserver = new ResizeObserver(updateVisibleCount);

    resizeObserver.observe(row);
    resizeObserver.observe(measurement);

    return () => resizeObserver.disconnect();
  }, [tags]);

  if (tags.length === 0) {
    return null;
  }

  let overflowContent: ReactNode = null;

  if (remainingTags.length > 0) {
    overflowContent = interactive ? (
      <Popover.Root>
        <Popover.Trigger
          aria-label={`Show ${remainingTags.length} more tags for "${task.title}"`}
          className={tagStyles.tagOverflowTrigger}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          +{remainingTags.length}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner className={tagStyles.tagOverflowPositioner} sideOffset={4}>
            <Popover.Popup
              aria-label={`More tags for "${task.title}"`}
              className={clsx(tagStyles.tagOverflowPopup, popupStyles.popup)}
            >
              {remainingTags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ) : (
      <span className={tagStyles.tagOverflowTrigger}>+{remainingTags.length}</span>
    );
  }

  return (
    <div className={tagStyles.taskTags} ref={rowRef}>
      {visibleTags.map((tag) => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {overflowContent}
      <div aria-hidden="true" className={tagStyles.tagMeasurementViewport}>
        <div className={tagStyles.tagMeasurements} ref={measurementRef}>
          {tags.map((tag) => (
            <TagChip key={`tag-${tag.id}`} tag={tag} />
          ))}
          {tags.map((tag, index) => (
            <span className={tagStyles.tagOverflowTrigger} key={`overflow-${tag.id}`}>
              +{index + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface TaskRowProps {
  completionDisabled: boolean;
  dragHandleProps?: ComponentPropsWithoutRef<'div'>;
  dragHandleRef?: (node: HTMLDivElement | null) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onCompletedChange: (task: Task, completed: boolean) => void;
  onEdit: (task: Task) => void;
  rowRef?: (node: HTMLLIElement | null) => void;
  style?: CSSProperties;
  task: Task;
}

export const TaskDragPreview = ({ task }: { task: Task }) => (
  <div aria-hidden="true" className={clsx(styles.task, styles.dragPreview)}>
    <span className={styles.completionControl}>
      <span className={styles.completionBox} />
    </span>
    <div className={styles.taskContent}>
      <span className={styles.taskTitle}>{task.title}</span>
      <TaskTags interactive={false} task={task} />
    </div>
    <span className={clsx(buttonStyles.button, styles.optionsButton)}>
      <EllipsisVertical size="1.25rem" />
    </span>
  </div>
);

export default function TaskRow({
  completionDisabled,
  dragHandleProps,
  dragHandleRef,
  draggable = false,
  isDragging = false,
  onCompletedChange,
  onEdit,
  rowRef,
  style,
  task,
}: TaskRowProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const menuActionsRef = useRef<Menu.Root.Actions | null>(null);
  const completed = task.completedAt !== null;

  useEffect(() => {
    if (isDragging) {
      menuActionsRef.current?.close();
    }
  }, [isDragging]);

  return (
    <li
      className={clsx(styles.task, completed && styles.completed, isDragging && styles.dragging)}
      ref={rowRef}
      style={style}
    >
      <Checkbox.Root
        aria-label={completed ? `Mark "${task.title}" active` : `Mark "${task.title}" complete`}
        checked={completed}
        className={styles.completionControl}
        disabled={completionDisabled}
        onCheckedChange={(checked) => onCompletedChange(task, checked)}
      >
        <span aria-hidden="true" className={styles.completionBox}>
          <Checkbox.Indicator className={styles.completionIndicator}>
            <Check size={checkIconSize} strokeWidth={3} />
          </Checkbox.Indicator>
        </span>
      </Checkbox.Root>
      <div
        className={clsx(styles.taskContent, draggable && styles.dragHandle)}
        ref={dragHandleRef}
        {...dragHandleProps}
      >
        <span className={styles.taskTitle}>{task.title}</span>
        <TaskTags task={task} />
      </div>
      <Menu.Root actionsRef={menuActionsRef}>
        <IconTooltip label="Task options">
          <Menu.Trigger
            aria-label={`Options for "${task.title}"`}
            className={clsx(buttonStyles.button, styles.optionsButton)}
          >
            <EllipsisVertical size="1.25rem" />
          </Menu.Trigger>
        </IconTooltip>
        <Menu.Portal>
          <Menu.Positioner
            align="end"
            className={styles.optionsPositioner}
            side="bottom"
            sideOffset={4}
          >
            <Menu.Popup className={clsx(styles.optionsPanel, popupStyles.popup)}>
              <Menu.Item
                className={clsx(
                  buttonStyles.button,
                  buttonStyles.standard,
                  buttonStyles.fullWidth,
                  buttonStyles.primary,
                )}
                onClick={() => onEdit(task)}
              >
                <span className={buttonStyles.buttonTop}>
                  <FilePen size={actionIconSize} />
                  Edit
                </span>
              </Menu.Item>
              <Menu.Item
                className={clsx(
                  buttonStyles.button,
                  buttonStyles.standard,
                  buttonStyles.fullWidth,
                  buttonStyles.destructive,
                )}
                onClick={() => setIsDeleteOpen(true)}
              >
                <span className={buttonStyles.buttonTop}>
                  <Trash2 size={actionIconSize} />
                  Delete
                </span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <TaskDeleteDialog id={task.id} onOpenChange={setIsDeleteOpen} open={isDeleteOpen} />
    </li>
  );
}
