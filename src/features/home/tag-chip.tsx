import type { CSSProperties } from 'react';

import type { Tag } from '../../types';

import styles from './tag.module.css';

interface TagStyle extends CSSProperties {
  '--tag-color': string;
  '--tag-foreground': string;
}

const getRelativeLuminance = (color: string) => {
  const channels = color
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 4.045e-2 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return channels ? 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] : 0;
};

const getTagForeground = (background: string) =>
  getRelativeLuminance(background) > 0.179 ? '#111111' : '#ffffff';

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
