import { TAG_PRESET_COLORS, UPPERCASE_TAG_PRESETS, type TagColor, type TagPreset } from './constants.js';
import { isTagColor, normalizeBackgroundColor, normalizeForegroundColor } from './color.js';

export interface TagAppearanceInput {
  label: string;
  bgcolor?: string;
  fgcolor?: string;
  arrow?: boolean;
}

export interface TagAppearance {
  classes: string[];
  style: Record<string, string>;
}

function isTagPreset(label: string): label is TagPreset {
  return Object.hasOwn(TAG_PRESET_COLORS, label);
}

/**
 * Works out the CSS classes and inline style for a tag. A hex background is
 * passed to the stylesheet as `--md-tag-color`, so the arrow's point can use
 * it too. Precedence for the background: explicit color, then the label's
 * preset color, then grey.
 */
export function resolveTagAppearance({ label, bgcolor, fgcolor, arrow = false }: TagAppearanceInput): TagAppearance {
  const classes = ['md-tag'];
  const style: Record<string, string> = {};

  const preset = label.toLowerCase();
  const background = normalizeBackgroundColor(bgcolor);
  const foreground = normalizeForegroundColor(fgcolor);

  if (background && !isTagColor(background)) {
    style['--md-tag-color'] = background;
  } else {
    const color: TagColor = background
      ? (background as TagColor)
      : isTagPreset(preset)
        ? TAG_PRESET_COLORS[preset]
        : 'grey';
    classes.push(`md-tag--${color}`);
  }

  if (foreground) style.color = foreground;
  if (arrow) classes.push('md-tag--arrow');
  if (isTagPreset(preset) && UPPERCASE_TAG_PRESETS.includes(preset)) classes.push('md-tag--uppercase');

  return { classes, style };
}
