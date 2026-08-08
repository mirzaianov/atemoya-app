'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import DeleteModalLayout from '../../components/delete-modal-layout';
import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import { deleteTaskAction } from './task-actions';

import styles from './task-delete-dialog.module.css';

interface TaskDeleteDialogProps {
  id: string;
  onDeleted: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export default function TaskDeleteDialog({
  id,
  onDeleted,
  onOpenChange,
  open,
}: TaskDeleteDialogProps) {
  const router = useRouter();
  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTaskAction(id),
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await deleteTaskMutation.mutateAsync();

      if (result.error) {
        toast.error(result.error);

        return;
      }

      onDeleted(id);
      toast.info('Task deleted');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Task could not be deleted. Please try again.');
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <ModalLayout alert title="Delete Task">
        <DeleteModalLayout
          confirmDisabled={false}
          confirmPending={deleteTaskMutation.isPending}
          onSubmit={handleSubmit}
        >
          <AlertDialog.Description className={styles.message}>
            This task will be deleted.
          </AlertDialog.Description>
        </DeleteModalLayout>
      </ModalLayout>
    </AlertDialog.Root>
  );
}
