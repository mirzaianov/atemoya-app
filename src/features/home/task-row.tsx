'use client';

import { Checkbox } from '@base-ui/react/checkbox';
import { Menu } from '@base-ui/react/menu';
import clsx from 'clsx';
import { Check, EllipsisVertical, FilePen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import IconTooltip from '../../components/icon-tooltip';
import type { Task } from '../../types';
import TaskDeleteDialog from './task-delete-dialog';

import buttonStyles from '../../components/button.module.css';
import styles from './task.module.css';

const actionIconSize = 20;
const checkIconSize = 14;

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
            <Menu.Popup className={styles.optionsPanel}>
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
