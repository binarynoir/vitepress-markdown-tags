import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { markdownTags } from '../src/plugin.js';

const render = (source: string, options?: Parameters<typeof markdownTags>[1]) =>
  new MarkdownIt({ html: true }).use(markdownTags, options).render(source);

describe('markdownTags', () => {
  it('registers a core rule before normalize', () => {
    const md = new MarkdownIt().use(markdownTags);
    const rules = (md.core.ruler as unknown as { __rules__: { name: string }[] }).__rules__.map((rule) => rule.name);
    expect(rules.indexOf('markdown_tags')).toBe(rules.indexOf('normalize') - 1);
  });

  it('renders a tag as inline component HTML in a paragraph', () => {
    expect(render('Status: ((tag|Done|green))')).toBe(
      '<p>Status: <MarkdownTag label="Done" bgcolor="green"></MarkdownTag></p>\n',
    );
  });

  it('renders the arrow variant', () => {
    expect(render('((<tag|v2))')).toContain('<MarkdownTag label="v2" arrow></MarkdownTag>');
  });

  it('works inside headings, lists and tables', () => {
    const html = render('# Title ((tag|WIP))\n\n- item ((tag|Done))\n\n| a |\n| - |\n| ((tag|x)) |\n');
    expect(html).toContain('<h1>Title <MarkdownTag label="WIP"></MarkdownTag></h1>');
    expect(html).toContain('<li>item <MarkdownTag label="Done"></MarkdownTag></li>');
    expect(html).toContain('<td><MarkdownTag label="x"></MarkdownTag></td>');
  });

  it('keeps tag syntax in code blocks and inline code, rendered as plain code', () => {
    const html = render('Use `((tag|Done))`.\n\n```md\n((tag|Done))\n```\n');
    expect(html).toContain('<code>((tag|Done))</code>');
    expect(html).toContain('((tag|Done))\n</code></pre>');
    expect(html).not.toContain('<MarkdownTag');
  });

  it('transforms tags written next to markdown formatting', () => {
    expect(render('**bold** ((tag|x)) _it_')).toContain(
      '<strong>bold</strong> <MarkdownTag label="x"></MarkdownTag> <em>it</em>',
    );
  });

  it('honors a custom component name', () => {
    expect(render('((tag|x))', { componentName: 'Badge' })).toContain('<Badge label="x"></Badge>');
  });

  it('escapes the component HTML when raw HTML is disabled, rather than emitting live markup', () => {
    const html = new MarkdownIt({ html: false }).use(markdownTags).render('((tag|x))');
    expect(html).toContain('&lt;MarkdownTag');
  });

  it('leaves unrelated Markdown untouched', () => {
    const source = '# Hi\n\nPlain text with (parens) and `code`.\n';
    expect(render(source)).toBe(new MarkdownIt({ html: true }).render(source));
  });
});
