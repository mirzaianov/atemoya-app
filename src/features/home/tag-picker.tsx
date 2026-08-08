'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown, CirclePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import type { Tag } from '../../types';
import { createTagAction } from './tag-actions';
import TagChip from './tag-chip';
import TagEditor from './tag-editor';
import type { TagFormValues } from './tag-schemas';

import popupStyles from '../../styles/popup.module.css';
import styles from './tag.module.css';

const maxSelectedTags = 10;

interface SwatchStyle extends CSSProperties {
  '--tag-color': string;
}

interface TagPickerProps {
  disabled?: boolean;
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
  value: string[];
}

export default function TagPicker({ disabled = false, onChange, tags, value }: TagPickerProps) {
  const router = useRouter();
  const inputId = useId();
  const [createdTags, setCreatedTags] = useState<Tag[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previousTags, setPreviousTags] = useState(tags);

  if (tags !== previousTags) {
    const serverTagIds = new Set(tags.map(({ id }) => id));

    setPreviousTags(tags);
    setCreatedTags((current) => current.filter(({ id }) => !serverTagIds.has(id)));
  }

  const availableTags = useMemo(() => {
    const tagsById = new Map([...createdTags, ...tags].map((tag) => [tag.id, tag]));

    // oxlint-disable-next-line unicorn/no-array-sort -- The project targets ES2022.
    return [...tagsById.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [createdTags, tags]);
  const selectedIds = new Set(value);
  const selectedTags = value
    .map((id) => availableTags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const atLimit = selectedTags.length >= maxSelectedTags;
  const createMutation = useMutation({ mutationFn: createTagAction });

  const handleCreate = async (values: TagFormValues) => {
    try {
      const result = await createMutation.mutateAsync(values);
      const { error, tag } = result;

      if (error || !tag) {
        toast.error(error ?? 'Tag could not be created. Please try again.');

        return;
      }

      const existing = availableTags.some(({ id }) => id === tag.id);

      if (!existing) {
        setCreatedTags((current) => [...current, tag]);
      }
      if (!value.includes(tag.id)) {
        onChange([...value, tag.id]);
      }

      toast.success(existing ? 'Existing tag selected' : 'Tag created');
      setEditorOpen(false);
      router.refresh();
    } catch {
      toast.error('Tag could not be created. Please try again.');
    }
  };

  return (
    <div className={styles.picker}>
      <label className={styles.filterLabel} htmlFor={inputId}>
        Tags
      </label>
      <Combobox.Root
        disabled={disabled}
        isItemEqualToValue={(item, selected) => item.id === selected.id}
        itemToStringLabel={(tag) => tag.name}
        items={availableTags}
        multiple
        onValueChange={(selected) =>
          onChange(selected.slice(0, maxSelectedTags).map(({ id }) => id))
        }
        value={selectedTags}
      >
        <Combobox.InputGroup className={styles.filterControl}>
          <Combobox.Chips className={styles.filterChips}>
            <Combobox.Value>
              {(selected: Tag[]) => (
                <>
                  {selected.map((tag) => (
                    <Combobox.Chip aria-label={tag.name} className={styles.filterChip} key={tag.id}>
                      <TagChip tag={tag} />
                      <Combobox.ChipRemove
                        aria-label={`Remove ${tag.name}`}
                        className={styles.chipRemove}
                      >
                        <X aria-hidden="true" size={13} />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    className={styles.filterInput}
                    id={inputId}
                    placeholder={selected.length === 0 ? 'Choose tags' : ''}
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
          {selectedTags.length > 0 ? (
            <Combobox.Clear aria-label="Clear tags" className={styles.filterIconButton}>
              <X aria-hidden="true" size={16} />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger aria-label="Open tags" className={styles.filterIconButton}>
            <ChevronDown aria-hidden="true" size={17} />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className={styles.pickerPositioner} sideOffset={4}>
            <Combobox.Popup className={`${styles.filterPopup} ${popupStyles.popup}`}>
              <Combobox.Empty className={styles.filterEmpty}>No tags found</Combobox.Empty>
              <Combobox.List className={styles.filterList}>
                {(tag: Tag) => {
                  const selected = selectedIds.has(tag.id);
                  const swatchStyle: SwatchStyle = { '--tag-color': tag.color };

                  return (
                    <Combobox.Item
                      className={styles.filterItem}
                      disabled={atLimit && !selected}
                      key={tag.id}
                      value={tag}
                    >
                      <Combobox.ItemIndicator className={styles.itemIndicator}>
                        <Check aria-hidden="true" size={15} />
                      </Combobox.ItemIndicator>
                      <span aria-hidden="true" className={styles.tagSwatch} style={swatchStyle} />
                      <span>{tag.name}</span>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <span aria-live="polite" className={styles.visuallyHidden}>
        {atLimit ? 'Maximum of 10 tags selected' : ''}
      </span>
      <button
        className={styles.createTagButton}
        disabled={disabled || atLimit}
        onClick={() => setEditorOpen(true)}
        type="button"
      >
        <CirclePlus aria-hidden="true" size={16} />
        Create tag
      </button>
      <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <ModalLayout closeDisabled={createMutation.isPending} title="Create Tag">
          <TagEditor
            onCancel={() => setEditorOpen(false)}
            onSave={handleCreate}
            pending={createMutation.isPending}
            saveLabel="Create"
          />
        </ModalLayout>
      </Dialog.Root>
    </div>
  );
}
