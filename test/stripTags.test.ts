import { describe, expect, it } from 'vitest';
import { stripTags } from '../src/transformTags.js';

describe('stripTags', () => {
  it('removes a tag from text', () => {
    expect(stripTags('Release notes ((tag|New))')).toBe('Release notes');
  });

  it('collapses the space a removed tag leaves behind', () => {
    expect(stripTags('Test ((tag|TestTag)) Title')).toBe('Test Title');
  });

  it('removes several tags, including the arrow and colored forms', () => {
    expect(stripTags('A ((tag|One)) B ((<tag|Two|red)) C ((tag/Three/#fff/#000))')).toBe('A B C');
  });

  it('returns text without tags exactly as given, even with unusual spacing', () => {
    expect(stripTags('  Keep   my  spacing ')).toBe('  Keep   my  spacing ');
  });

  it('returns an empty string for an empty string', () => {
    expect(stripTags('')).toBe('');
  });

  it('returns an empty string when only a tag was present', () => {
    expect(stripTags('((tag|Done))')).toBe('');
  });

  it('leaves a blank-label tag alone, matching transformTags', () => {
    expect(stripTags('Title ((tag| ))')).toBe('Title ((tag| ))');
  });
});
