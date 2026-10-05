import { describe, expect, it } from 'vitest';
import { isHexColor, isTagColor, normalizeBackgroundColor, normalizeForegroundColor } from '../src/color.js';
import { TAG_COLORS } from '../src/constants.js';

describe('isHexColor', () => {
  it.each(['#fff', '#FFF', '#7a5add', '#7A5ADD'])('accepts %s', (value) => {
    expect(isHexColor(value)).toBe(true);
  });

  it.each(['fff', '#ff', '#ffff', '#fffff', '#fffffff', '#ggg', '', '# fff', 'red'])('rejects %j', (value) => {
    expect(isHexColor(value)).toBe(false);
  });
});

describe('isTagColor', () => {
  it.each(TAG_COLORS)('accepts %s in any case', (color) => {
    expect(isTagColor(color)).toBe(true);
    expect(isTagColor(color.toUpperCase())).toBe(true);
  });

  it.each(['pink', '', '#fff', 'constructor', '__proto__'])('rejects %j', (value) => {
    expect(isTagColor(value)).toBe(false);
  });
});

describe('normalizeBackgroundColor', () => {
  it('lowercases palette names and keeps hex as written', () => {
    expect(normalizeBackgroundColor('Blue')).toBe('blue');
    expect(normalizeBackgroundColor('#AbC')).toBe('#AbC');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(normalizeBackgroundColor(undefined)).toBe('');
    expect(normalizeBackgroundColor('')).toBe('');
    expect(normalizeBackgroundColor('pink')).toBe('');
  });
});

describe('normalizeForegroundColor', () => {
  it('accepts only hex', () => {
    expect(normalizeForegroundColor('#fff')).toBe('#fff');
    expect(normalizeForegroundColor('red')).toBe('');
    expect(normalizeForegroundColor(undefined)).toBe('');
  });
});
