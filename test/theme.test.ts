import { createApp } from 'vue';
import { describe, expect, it } from 'vitest';
import { MarkdownTag, registerMarkdownTags } from '../src/theme.js';

describe('registerMarkdownTags', () => {
  it('registers the component under the default name', () => {
    const app = createApp({});
    registerMarkdownTags(app);
    expect(app.component('MarkdownTag')).toBe(MarkdownTag);
  });

  it('registers under a custom name', () => {
    const app = createApp({});
    registerMarkdownTags(app, { componentName: 'Badge' });
    expect(app.component('Badge')).toBe(MarkdownTag);
    expect(app.component('MarkdownTag')).toBeUndefined();
  });
});
