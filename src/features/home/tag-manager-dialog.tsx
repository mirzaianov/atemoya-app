'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { FilePen, Settings2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import type { Tag } from '../../types';
import { updateTagAction } from './tag-actions';
import TagChip from './tag-chip';
import TagDeleteDialog from './tag-delete-dialog';
import TagEditor from './tag-editor';
import type { TagFormValues } from './tag-schemas';

import buttonStyles from '../../components/button.module.css';
import styles from './tag.module.css';

interface TagManagerDialogProps {
  onDeleted: (id: string) => void;
  onUpdated: (tag: Tag) => void;
  tags: Tag[];
}

export default function TagManagerDialog({ onDeleted, onUpdated, tags }: TagManagerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TagFormValues }) =>
      updateTagAction(id, values),
  });

  const closeManager = () => {
    setEditingTag(null);
    setOpen(false);
  };

  const handleSave = async (values: TagFormValues) => {
    if (!editingTag) {
      return;
    }

    try {
      const result = await updateMutation.mutateAsync({ id: editingTag.id, values });

      if (result.error || !result.tag) {
        toast.error(result.error ?? 'Tag could not be updated. Please try again.');

        return;
      }

      onUpdated(result.tag);
      toast.info('Tag updated');
      closeManager();
      router.refresh();
    } catch {
      toast.error('Tag could not be updated. Please try again.');
    }
  };

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingTag(null);
          }
          setOpen(nextOpen);
        }}
      >
        <Dialog.Trigger
          className={clsx(
            buttonStyles.button,
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.primary,
          )}
          type="button"
        >
          <span className={buttonStyles.buttonTop}>
            <Settings2 size={20} />
            Manage Tags
          </span>
        </Dialog.Trigger>
        <ModalLayout
          closeDisabled={updateMutation.isPending}
          title={editingTag ? 'Edit Tag' : 'Manage Tags'}
        >
          {editingTag ? (
            <TagEditor
              initialValue={{ color: editingTag.color, name: editingTag.name }}
              key={editingTag.id}
              onCancel={() => setEditingTag(null)}
              onSave={handleSave}
              pending={updateMutation.isPending}
              saveLabel="Save"
            />
          ) : (
            <div className={styles.manager}>
              {tags.length === 0 ? (
                <p className={styles.managerEmpty}>No tags yet.</p>
              ) : (
                <ul className={styles.managerList}>
                  {tags.map((tag) => (
                    <li className={styles.managerItem} key={tag.id}>
                      <TagChip tag={tag} />
                      <div className={styles.managerActions}>
                        <button
                          aria-label={`Edit ${tag.name}`}
                          className={clsx(buttonStyles.button, styles.managerAction)}
                          onClick={() => setEditingTag(tag)}
                          type="button"
                        >
                          <FilePen aria-hidden="true" size={18} />
                          Edit
                        </button>
                        <button
                          aria-label={`Delete ${tag.name}`}
                          className={clsx(buttonStyles.button, styles.managerAction)}
                          onClick={() => setDeletingTag(tag)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={18} />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ModalLayout>
      </Dialog.Root>
      {deletingTag ? (
        <TagDeleteDialog
          id={deletingTag.id}
          onDeleted={(id) => {
            onDeleted(id);
            setDeletingTag(null);
            closeManager();
          }}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setDeletingTag(null);
            }
          }}
          open
        />
      ) : null}
    </>
  );
}
