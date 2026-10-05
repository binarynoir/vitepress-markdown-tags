import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import { MarkdownTag } from '../src/MarkdownTag.js';

async function render(props: Record<string, unknown>): Promise<string> {
  return renderToString(createSSRApp(MarkdownTag, props));
}

describe('MarkdownTag', () => {
  it('renders the label in a span', async () => {
    expect(await render({ label: 'Done' })).toBe('<span class="md-tag md-tag--green">Done</span>');
  });

  it('escapes the label', async () => {
    expect(await render({ label: '<b>x</b>' })).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('renders palette backgrounds and the arrow style as classes', async () => {
    expect(await render({ label: 'x', bgcolor: 'red', arrow: true })).toBe(
      '<span class="md-tag md-tag--red md-tag--arrow">x</span>',
    );
  });

  it('renders custom colors as inline style', async () => {
    const html = await render({ label: 'x', bgcolor: '#123456', fgcolor: '#fff' });
    expect(html).toContain('--md-tag-color:#123456');
    expect(html).toContain('color:#fff');
  });

  it('is named MarkdownTag', () => {
    expect(MarkdownTag.name).toBe('MarkdownTag');
  });
});
