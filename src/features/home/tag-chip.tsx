import type { CSSProperties } from 'react';

import type { Tag } from '../../types';
import { getTagForeground } from './tag-colors';

import styles from './tag.module.css';

interface TagStyle extends CSSProperties {
  '--tag-color': string;
  '--tag-foreground': string;
}

export default function TagChip({ tag }: { tag: Tag }) {
  const style: TagStyle = {
    '--tag-color': tag.color,
    '--tag-foreground': getTagForeground(tag.color),
  };

  return (
    <span className={styles.tagChip} style={style}>
      {tag.name}
    </span>
  );
}
