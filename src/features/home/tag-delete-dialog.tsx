'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import DeleteModalLayout from '../../components/delete-modal-layout';
import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import { deleteTagAction } from './tag-actions';

import styles from './tag.module.css';

interface TagDeleteDialogProps {
  id: string;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export default function TagDeleteDialog({
  id,
  onDeleted,
  onOpenChange,
  open,
}: TagDeleteDialogProps) {
  const router = useRouter();
  const deleteMutation = useMutation({
    mutationFn: () => deleteTagAction(id),
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await deleteMutation.mutateAsync();

      if (result.error) {
        toast.error(result.error);

        return;
      }

      toast.info('Tag deleted');
      onOpenChange(false);
      onDeleted();
      router.refresh();
    } catch {
      toast.error('Tag could not be deleted. Please try again.');
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <ModalLayout alert closeDisabled={deleteMutation.isPending} title="Delete Tag">
        <DeleteModalLayout
          confirmDisabled={false}
          confirmPending={deleteMutation.isPending}
          onSubmit={handleSubmit}
        >
          <AlertDialog.Description className={styles.deleteMessage}>
            This tag will be removed from every task. The tasks will not be deleted.
          </AlertDialog.Description>
        </DeleteModalLayout>
      </ModalLayout>
    </AlertDialog.Root>
  );
}
