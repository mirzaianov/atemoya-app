const darkForeground = '#111111';
const lightForeground = '#ffffff';
const hexColorPattern = /^#[0-9a-f]{6}$/iu;

export const tagPalette = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
] as const;

export const normalizeTagColor = (color: string) => {
  if (!hexColorPattern.test(color)) {
    throw new TypeError('Invalid tag color');
  }

  return color.toLowerCase();
};

const getRelativeLuminance = (color: string) => {
  const normalizedColor = normalizeTagColor(color);
  const channels = [
    normalizedColor.slice(1, 3),
    normalizedColor.slice(3, 5),
    normalizedColor.slice(5, 7),
  ]
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 4.045e-2 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const [red = 0, green = 0, blue = 0] = channels;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const getContrast = (first: number, second: number) =>
  (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);

export const getTagForeground = (background: string) => {
  const backgroundLuminance = getRelativeLuminance(background);
  const darkContrast = getContrast(backgroundLuminance, getRelativeLuminance(darkForeground));
  const lightContrast = getContrast(backgroundLuminance, getRelativeLuminance(lightForeground));

  return darkContrast >= lightContrast ? darkForeground : lightForeground;
};
