import { TAG_COLORS, type TagColor } from './constants.js';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}){1,2}$/i;

/** Whether `value` is a 3- or 6-digit hex color such as `#fff` or `#7a5add`. */
export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/** Whether `value` is one of the named palette colors, ignoring case. */
export function isTagColor(value: string): value is TagColor {
  return (TAG_COLORS as readonly string[]).includes(value.toLowerCase());
}

/**
 * Returns a usable background color (palette names lowercased, hex as
 * written), or `''` if the value is missing or not a valid color.
 */
export function normalizeBackgroundColor(value: string | undefined): string {
  if (!value) return '';
  if (isHexColor(value)) return value;
  return isTagColor(value) ? value.toLowerCase() : '';
}

/** Returns a usable text color, or `''`. Only hex is accepted: a palette name would be unreadable on its own background. */
export function normalizeForegroundColor(value: string | undefined): string {
  return value && isHexColor(value) ? value : '';
}
