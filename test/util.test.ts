import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/util.js';

describe('escapeHtml', () => {
  it('escapes all five special characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes ampersands once, not repeatedly', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('leaves safe text alone', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});
