'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, X } from 'lucide-react';
import { useId } from 'react';
import type { CSSProperties } from 'react';

import type { Tag } from '../../types';
import TagChip from './tag-chip';

import styles from './tag.module.css';

const maxSelectedTags = 10;

interface SwatchStyle extends CSSProperties {
  '--tag-color': string;
}

interface TagFilterProps {
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
  value: string[];
}

export default function TagFilter({ onChange, tags, value }: TagFilterProps) {
  const inputId = useId();
  const selectedIds = new Set(value);
  const selectedTags = value
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const atLimit = selectedTags.length >= maxSelectedTags;

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={styles.filter}>
      <label className={styles.filterLabel} htmlFor={inputId}>
        Filter by tags
      </label>
      <Combobox.Root
        isItemEqualToValue={(item, selected) => item.id === selected.id}
        itemToStringLabel={(tag) => tag.name}
        items={tags}
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
                  {selected.slice(0, 2).map((tag) => (
                    <Combobox.Chip aria-label={tag.name} className={styles.filterChip} key={tag.id}>
                      <TagChip tag={tag} />
                      <Combobox.ChipRemove
                        aria-label={`Remove ${tag.name} filter`}
                        className={styles.chipRemove}
                      >
                        <X aria-hidden="true" size={13} />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  {selected.length > 2 ? (
                    <span className={styles.moreSelected}>+{selected.length - 2} more</span>
                  ) : null}
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
            <Combobox.Clear aria-label="Clear tag filters" className={styles.filterIconButton}>
              <X aria-hidden="true" size={16} />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger aria-label="Open tag filters" className={styles.filterIconButton}>
            <ChevronDown aria-hidden="true" size={17} />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className={styles.filterPositioner} sideOffset={4}>
            <Combobox.Popup className={styles.filterPopup}>
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
        {atLimit ? 'Maximum of 10 tag filters selected' : ''}
      </span>
    </div>
  );
}
