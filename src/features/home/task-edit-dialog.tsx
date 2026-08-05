'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import EditModalLayout from '../../components/edit-modal-layout';
import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import type { Task } from '../../types';
import { updateTaskAction } from './task-actions';
import { taskSchema } from './task-schemas';
import type { TaskFormInput, TaskFormValues } from './task-schemas';

import formStyles from '../../components/modal-form-layout.module.css';
import validationStyles from '../../styles/form.module.css';
import inputStyles from './task-form.module.css';

interface TaskEditDialogProps {
  editingTask: Task | null;
  onClose: () => void;
}

export default function TaskEditDialog({ editingTask, onClose }: TaskEditDialogProps) {
  const router = useRouter();
  const {
    control,
    formState: { isValid },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<TaskFormInput, undefined, TaskFormValues>({
    defaultValues: { tagIds: [], title: '' },
    mode: 'onChange',
    resolver: zodResolver(taskSchema),
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      updateTaskAction(id, values),
  });

  useEffect(() => {
    if (!editingTask) {
      reset({ tagIds: [], title: '' });

      return;
    }

    reset({
      tagIds: editingTask.tags.map(({ id }) => id),
      title: editingTask.title,
    });
    setFocus('title');
  }, [editingTask, reset, setFocus]);

  const onSubmit = handleSubmit(async (values) => {
    if (!editingTask) {
      return;
    }

    try {
      const result = await updateTaskMutation.mutateAsync({
        id: editingTask.id,
        values,
      });

      if (result.error) {
        toast.error(result.error);

        return;
      }

      toast.info('Task updated');
      onClose();
      reset({ tagIds: [], title: '' });
      router.refresh();
    } catch {
      toast.error('Task could not be updated. Please try again.');
    }
  });

  return (
    <Dialog.Root
      open={Boolean(editingTask)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ModalLayout title="Edit Task">
        <EditModalLayout
          confirmDisabled={!editingTask || !isValid}
          confirmPending={updateTaskMutation.isPending}
          onSubmit={onSubmit}
        >
          <Controller
            control={control}
            name="title"
            render={({
              field: { name, onBlur, onChange, ref, value },
              fieldState: { error, invalid, isDirty, isTouched },
            }) => (
              <Field.Root
                className={formStyles.formControl}
                dirty={isDirty}
                invalid={invalid}
                name={name}
                touched={isTouched}
              >
                <Field.Label className={formStyles.label}>Task</Field.Label>
                <Field.Control
                  autoComplete="off"
                  className={clsx(inputStyles.input, validationStyles.validationInput)}
                  id="edit-task"
                  onBlur={onBlur}
                  onValueChange={onChange}
                  ref={ref}
                  type="text"
                  value={value}
                />
                <Field.Error aria-live="polite" className={formStyles.error} match>
                  {error?.message ?? ''}
                </Field.Error>
              </Field.Root>
            )}
          />
        </EditModalLayout>
      </ModalLayout>
    </Dialog.Root>
  );
}
