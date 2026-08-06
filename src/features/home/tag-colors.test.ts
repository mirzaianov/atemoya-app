import assert from 'node:assert/strict';
import test from 'node:test';

import { getTagForeground, normalizeTagColor, tagPalette } from './tag-colors.ts';

test('normalizes exact six-digit tag colors', () => {
  assert.equal(normalizeTagColor('#AABBCC'), '#aabbcc');
  assert.throws(() => normalizeTagColor('#abc'), /Invalid tag color/u);
  assert.ok(tagPalette.every((color) => normalizeTagColor(color) === color));
});

test('chooses the higher-contrast approved tag foreground', () => {
  assert.equal(getTagForeground('#ffffff'), '#111111');
  assert.equal(getTagForeground('#000000'), '#ffffff');
  assert.equal(getTagForeground('#777777'), '#ffffff');
  assert.equal(getTagForeground('#7a7a7a'), '#111111');
});
