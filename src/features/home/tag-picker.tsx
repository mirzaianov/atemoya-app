'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';

import IconTooltip from '../../components/icon-tooltip';
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
  const [isPointerFocus, setIsPointerFocus] = useState(false);
  const [previousTags, setPreviousTags] = useState(tags);
  const [query, setQuery] = useState('');

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
  const orderedTags = [
    ...availableTags.filter(({ id }) => selectedIds.has(id)),
    ...availableTags.filter(({ id }) => !selectedIds.has(id)),
  ];
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
      <Combobox.Root<Tag, true>
        disabled={disabled}
        inputValue={query}
        isItemEqualToValue={(item, selected) => item.id === selected.id}
        itemToStringLabel={(tag) => tag.name}
        items={orderedTags}
        multiple
        onInputValueChange={setQuery}
        onValueChange={(selected) => {
          setQuery('');
          onChange(selected.slice(0, maxSelectedTags).map(({ id }) => id));
        }}
        value={selectedTags}
      >
        <Combobox.InputGroup
          className={styles.filterSearchControl}
          data-pointer-focus={isPointerFocus ? '' : undefined}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPointerFocus(false);
            }
          }}
          onKeyDownCapture={() => setIsPointerFocus(false)}
          onPointerDownCapture={() => setIsPointerFocus(true)}
        >
          <Combobox.Chips className={styles.filterChips}>
            <Combobox.Value>
              {(selected: Tag[]) => (
                <>
                  {selected.map((tag) => (
                    <Combobox.Chip
                      aria-label={tag.name}
                      className={styles.selectedFilterTag}
                      key={tag.id}
                    >
                      <TagChip tag={tag} />
                      <Combobox.ChipRemove
                        aria-label={`Remove ${tag.name}`}
                        className={styles.selectedFilterRemove}
                      >
                        <X aria-hidden="true" size={13} />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    className={styles.filterSearchInput}
                    id={inputId}
                    placeholder={selected.length === 0 ? 'Choose tags' : ''}
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
          {selectedTags.length > 0 ? (
            <IconTooltip label="Clear tags">
              <Combobox.Clear
                aria-label="Clear tags"
                className={`${styles.filterIconButton} ${styles.filterClearButton}`}
              >
                <X aria-hidden="true" size={20} />
              </Combobox.Clear>
            </IconTooltip>
          ) : null}
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner
            align="start"
            className={styles.pickerPositioner}
            side="bottom"
            sideOffset={4}
          >
            <Combobox.Popup
              className={`${styles.filterPopup} ${styles.pickerPopup} ${popupStyles.popup}`}
            >
              <Combobox.Empty className={styles.filterEmpty}>No tags found</Combobox.Empty>
              <Combobox.List className={styles.filterList}>
                <Combobox.Collection>
                  {(tag: Tag) => (
                    <Combobox.Item
                      className={styles.filterItem}
                      disabled={atLimit && !selectedIds.has(tag.id)}
                      key={tag.id}
                      value={tag}
                    >
                      <TagChip tag={tag} />
                    </Combobox.Item>
                  )}
                </Combobox.Collection>
                <button
                  className={styles.createTagButton}
                  disabled={disabled || atLimit}
                  onClick={() => {
                    setQuery('');
                    setEditorOpen(true);
                  }}
                  type="button"
                >
                  <span className={styles.createTagChip}>Create tag</span>
                </button>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <span aria-live="polite" className={styles.visuallyHidden}>
        {atLimit ? 'Maximum of 10 tags selected' : ''}
      </span>
      <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <ModalLayout compact closeDisabled={createMutation.isPending} title="Create Tag">
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
