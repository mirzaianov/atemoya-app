'use client';

import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, X } from 'lucide-react';
import { useId } from 'react';

import type { Tag } from '../../types';
import TagChip from './tag-chip';

import styles from './tag.module.css';

const maxSelectedTags = 10;

interface TagFilterProps {
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
  value: string[];
}

export default function TagFilter({ onChange, tags, value }: TagFilterProps) {
  const triggerId = useId();
  const selectedIds = new Set(value);
  const selectedTags = value
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const atLimit = selectedTags.length >= maxSelectedTags;

  return (
    <div className={styles.filter}>
      <label className={styles.filterLabel} htmlFor={triggerId}>
        Filter by tags
      </label>
      <div className={styles.filterControl}>
        <Select.Root<Tag, true>
          isItemEqualToValue={(item, selected) => item.id === selected.id}
          itemToStringLabel={(tag) => tag.name}
          multiple
          onValueChange={(selected) =>
            onChange(selected.slice(0, maxSelectedTags).map(({ id }) => id))
          }
          value={selectedTags}
        >
          <Select.Trigger
            className={styles.filterTrigger}
            disabled={tags.length === 0}
            id={triggerId}
          >
            <Select.Value className={styles.filterValue}>
              {(selected: Tag[]) =>
                selected.length === 0 ? (
                  <span className={styles.filterPlaceholder}>
                    {tags.length === 0 ? 'No tags to filter' : 'Choose tags'}
                  </span>
                ) : (
                  <>
                    {selected.slice(0, 2).map((tag) => (
                      <TagChip key={tag.id} tag={tag} />
                    ))}
                    {selected.length > 2 ? (
                      <span className={styles.moreSelected}>+{selected.length - 2} more</span>
                    ) : null}
                  </>
                )
              }
            </Select.Value>
            <Select.Icon className={styles.filterChevron}>
              <ChevronDown aria-hidden="true" size={17} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className={styles.filterPositioner} sideOffset={4}>
              <Select.Popup className={styles.filterPopup}>
                <Select.List className={styles.filterList}>
                  {tags.map((tag) => (
                    <Select.Item
                      className={styles.filterItem}
                      disabled={atLimit && !selectedIds.has(tag.id)}
                      key={tag.id}
                      label={tag.name}
                      value={tag}
                    >
                      <Select.ItemIndicator className={styles.itemIndicator}>
                        <Check aria-hidden="true" size={15} />
                      </Select.ItemIndicator>
                      <Select.ItemText className={styles.filterItemText}>
                        <TagChip tag={tag} />
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        {selectedTags.length > 0 ? (
          <button
            aria-label="Clear tag filters"
            className={styles.filterIconButton}
            onClick={() => onChange([])}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>
      <span aria-live="polite" className={styles.visuallyHidden}>
        {atLimit ? 'Maximum of 10 tag filters selected' : ''}
      </span>
    </div>
  );
}
