'use client';

import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { CirclePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import Button from '../../components/button';
import { toast } from '../../components/toast-provider';
import { createTaskAction } from './task-actions';
import { taskSchema } from './task-schemas';
import type { TaskFormInput, TaskFormValues } from './task-schemas';

import buttonStyles from '../../components/button.module.css';
import styles from './home.module.css';
import inputStyles from './task-form.module.css';

const iconSize = 20;

export default function TaskForm() {
  const router = useRouter();
  const { control, handleSubmit, reset, setFocus } = useForm<
    TaskFormInput,
    undefined,
    TaskFormValues
  >({
    defaultValues: { tagIds: [], title: '' },
    resolver: zodResolver(taskSchema),
  });
  const taskTitle = useWatch({ control, name: 'title' });
  const hasTaskTitle = taskTitle.trim().length > 0;
  const createTaskMutation = useMutation({
    mutationFn: createTaskAction,
  });

  useEffect(() => {
    setFocus('title');
  }, [setFocus]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await createTaskMutation.mutateAsync(values);

      if (result.error) {
        toast.error(result.error);

        return;
      }

      toast.success('Task added');
      reset({ tagIds: [], title: '' });
      router.refresh();
    } catch {
      toast.error('Task could not be added. Please try again.');
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formRow}>
        <Controller
          control={control}
          name="title"
          render={({
            field: { name, onBlur, onChange, ref, value },
            fieldState: { invalid, isDirty, isTouched },
          }) => (
            <Field.Root
              className={inputStyles.field}
              dirty={isDirty}
              invalid={invalid}
              name={name}
              touched={isTouched}
            >
              <Field.Label className={inputStyles.visuallyHidden}>Task</Field.Label>
              <Field.Control
                required
                className={inputStyles.input}
                onBlur={onBlur}
                onValueChange={onChange}
                placeholder="Enter task"
                ref={ref}
                type="text"
                value={value}
              />
            </Field.Root>
          )}
        />
        <Button
          disabled={createTaskMutation.isPending || !hasTaskTitle}
          icon={<CirclePlus size={iconSize} />}
          loading={createTaskMutation.isPending}
          styling={clsx(buttonStyles.standard, buttonStyles.primary, inputStyles.addButton)}
          text="Add"
          type="submit"
        />
      </div>
    </form>
  );
}
