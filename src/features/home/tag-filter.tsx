'use client';

import { Combobox } from '@base-ui/react/combobox';
import { X } from 'lucide-react';
import { useState } from 'react';

import IconTooltip from '../../components/icon-tooltip';
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
  const [query, setQuery] = useState('');
  const selectedIds = new Set(value);
  const selectedTags = value
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
  const orderedTags = [
    ...tags.filter(({ id }) => selectedIds.has(id)),
    ...tags.filter(({ id }) => !selectedIds.has(id)),
  ];
  const atLimit = selectedTags.length >= maxSelectedTags;

  return (
    <div className={styles.filter}>
      <Combobox.Root<Tag, true>
        disabled={tags.length === 0}
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
        <Combobox.InputGroup className={styles.filterSearchControl}>
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
                        aria-label={`Remove ${tag.name} filter`}
                        className={styles.selectedFilterRemove}
                      >
                        <X aria-hidden="true" size={13} />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    aria-label="Filter by tag"
                    className={styles.filterSearchInput}
                    placeholder={selected.length === 0 ? 'Filter by tag' : undefined}
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
          {selectedTags.length > 0 ? (
            <IconTooltip label="Clear tag filters">
              <Combobox.Clear
                aria-label="Clear tag filters"
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
            className={styles.filterPositioner}
            side="bottom"
            sideOffset={4}
          >
            <Combobox.Popup className={styles.filterPopup}>
              <Combobox.Empty className={styles.filterEmpty}>No tags found</Combobox.Empty>
              <Combobox.List className={styles.filterList}>
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
