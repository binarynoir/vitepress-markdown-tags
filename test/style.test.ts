import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TAG_COLORS, TAG_PRESET_COLORS, UPPERCASE_TAG_PRESETS } from '../src/constants.js';

const css = fs.readFileSync(path.join(import.meta.dirname, '../src/style.css'), 'utf8');

describe('style.css', () => {
  it.each(TAG_COLORS)('defines a rule for the %s palette color', (color) => {
    expect(css).toMatch(new RegExp(`\\.md-tag--${color}\\s*\\{[^}]*--md-tag-color:\\s*#[0-9a-f]{6}`, 'i'));
  });

  it('covers every color a preset can resolve to', () => {
    for (const color of new Set(Object.values(TAG_PRESET_COLORS))) {
      expect(css).toContain(`.md-tag--${color}`);
    }
  });

  it('defines the arrow and uppercase modifiers the component emits', () => {
    expect(css).toContain('.md-tag--arrow');
    expect(css).toContain('.md-tag--uppercase');
    expect(UPPERCASE_TAG_PRESETS.length).toBeGreaterThan(0);
  });
});
