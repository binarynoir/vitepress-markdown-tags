import { describe, expect, it } from 'vitest';
import { resolveTagAppearance } from '../src/appearance.js';
import { TAG_PRESET_COLORS, UPPERCASE_TAG_PRESETS } from '../src/constants.js';

describe('resolveTagAppearance', () => {
  it('defaults an unknown label to grey', () => {
    expect(resolveTagAppearance({ label: 'Anything' })).toEqual({ classes: ['md-tag', 'md-tag--grey'], style: {} });
  });

  it.each(Object.entries(TAG_PRESET_COLORS))('colors the %s preset %s', (label, color) => {
    expect(resolveTagAppearance({ label }).classes).toContain(`md-tag--${color}`);
  });

  it('matches presets case-insensitively', () => {
    expect(resolveTagAppearance({ label: 'DONE' }).classes).toContain('md-tag--green');
  });

  it('lets an explicit palette background beat the preset color', () => {
    const { classes } = resolveTagAppearance({ label: 'done', bgcolor: 'red' });
    expect(classes).toContain('md-tag--red');
    expect(classes).not.toContain('md-tag--green');
  });

  it('accepts a palette background in any case', () => {
    expect(resolveTagAppearance({ label: 'x', bgcolor: 'PURPLE' }).classes).toContain('md-tag--purple');
  });

  it('passes a hex background as a CSS variable instead of a color class', () => {
    const { classes, style } = resolveTagAppearance({ label: 'done', bgcolor: '#123456' });
    expect(style).toEqual({ '--md-tag-color': '#123456' });
    expect(classes.some((name) => name.startsWith('md-tag--') && name !== 'md-tag--arrow')).toBe(false);
  });

  it('falls back to the preset or grey when the background is invalid', () => {
    expect(resolveTagAppearance({ label: 'done', bgcolor: 'nope' }).classes).toContain('md-tag--green');
    expect(resolveTagAppearance({ label: 'x', bgcolor: 'nope' }).classes).toContain('md-tag--grey');
  });

  it('applies a hex foreground color and ignores a named one', () => {
    expect(resolveTagAppearance({ label: 'x', fgcolor: '#000' }).style).toEqual({ color: '#000' });
    expect(resolveTagAppearance({ label: 'x', fgcolor: 'red' }).style).toEqual({});
  });

  it('adds the arrow modifier', () => {
    expect(resolveTagAppearance({ label: 'x', arrow: true }).classes).toContain('md-tag--arrow');
    expect(resolveTagAppearance({ label: 'x' }).classes).not.toContain('md-tag--arrow');
  });

  it('keeps a hex background on arrow tags, so the point can use it', () => {
    expect(resolveTagAppearance({ label: 'x', bgcolor: '#abc', arrow: true }).style['--md-tag-color']).toBe('#abc');
  });

  it.each(UPPERCASE_TAG_PRESETS)('uppercases the %s preset', (label) => {
    expect(resolveTagAppearance({ label }).classes).toContain('md-tag--uppercase');
  });

  it('does not uppercase other labels', () => {
    expect(resolveTagAppearance({ label: 'done' }).classes).not.toContain('md-tag--uppercase');
  });

  it('does not treat Object.prototype names as presets', () => {
    expect(resolveTagAppearance({ label: 'constructor' }).classes).toEqual(['md-tag', 'md-tag--grey']);
    expect(resolveTagAppearance({ label: 'toString' }).classes).toEqual(['md-tag', 'md-tag--grey']);
  });
});
