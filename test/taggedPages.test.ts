import MarkdownIt from 'markdown-it';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { markdownTags } from '../src/plugin.js';
import { scanTags } from '../src/scanTags.js';
import { fingerprintTaggedSource, resolveFolders, resolveTaggedPagesConfig } from '../src/taggedPages.js';

let root: string;

function write(relativePath: string, content: string): void {
  const file = path.join(root, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function renderPage(relativePath: string, frontmatter: unknown, body = '# Master\n'): string {
  const md = new MarkdownIt({ html: true }).use(markdownTags);
  return md.render(body, { frontmatter, path: path.join(root, relativePath), relativePath });
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'tagged-pages-'));
  write(
    'products/api.md',
    [
      '---',
      'title: Payments API',
      '---',
      '# Payments API ((tag|WIP))',
      '',
      '## Refunds',
      '- Partial refunds ((tag|TODO)) and ((tag|todo)) again',
      '',
      '```md',
      '((tag|TODO)) inside code is ignored',
      '```',
      '',
      '## Webhooks',
      'Retry policy ((tag|Done)) {{ 1 + 1 }} <b>',
    ].join('\n'),
  );
  write('products/sub/guide.md', '# Guide\n\n## Setup\nInstall ((tag|TODO))\n');
  write('ops/runbook.md', '# Runbook\n\nRotate keys ((tag|TODO)) ((tag|Blocked))\n');
  write('index.md', '# Home\n\n((tag|TODO))\n');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('scanTags', () => {
  it('records heading, anchor and context, and skips code', () => {
    const page = scanTags(
      '---\ntitle: T\n---\n# H ((tag|A))\n## Two words\n- [ ] item ((tag|B))\n```\n((tag|C))\n```\n`((tag|D))`\n',
      'fallback',
    );
    expect(page.title).toBe('T');
    expect(page.occurrences.map((o) => [o.label, o.heading, o.anchor, o.context])).toEqual([
      ['A', 'H', 'h', ''],
      ['B', 'Two words', 'two-words', 'item'],
    ]);
  });

  it('numbers repeated heading anchors like VitePress', () => {
    const page = scanTags('# T\n## Dup\n## Dup\n((tag|x))\n', 'f');
    expect(page.occurrences[0].anchor).toBe('dup-1');
  });

  it('falls back to the first h1, then the supplied title', () => {
    expect(scanTags('# From heading ((tag|x))\n', 'f').title).toBe('From heading');
    expect(scanTags('no heading ((tag|x))\n', 'file name').title).toBe('file name');
  });

  it('flags pages that have tagged frontmatter', () => {
    expect(scanTags('---\ntagged: true\n---\nx', 'f').isTaggedPage).toBe(true);
    expect(scanTags('tagged: true\n', 'f').isTaggedPage).toBe(false);
  });
});

describe('resolveTaggedPagesConfig', () => {
  it('is off without the key or when false', () => {
    expect(resolveTaggedPagesConfig({})).toBeNull();
    expect(resolveTaggedPagesConfig({ tagged: false })).toBeNull();
    expect(resolveTaggedPagesConfig(undefined)).toBeNull();
  });

  it('defaults to everything for `true`, and accepts lists or single strings', () => {
    expect(resolveTaggedPagesConfig({ tagged: true })).toEqual({ include: [], exclude: [], folders: [] });
    expect(resolveTaggedPagesConfig({ tagged: { include: 'todo', exclude: ['done', 3], folders: ['a'] } })).toEqual({
      include: ['todo'],
      exclude: ['done'],
      folders: ['a'],
    });
  });
});

describe('resolveFolders', () => {
  it('treats plain entries as source-relative and ./ and ../ as page-relative', () => {
    expect(resolveFolders(['products/', '/ops', './sub', '../ops', '.', '/'], 'products/tagged.md')).toEqual([
      'products',
      'ops',
      'products/sub',
      'ops',
      'products',
      '',
    ]);
  });
});

describe('tagged pages rendering', () => {
  it('lists every tag on every page by default, grouped and linked', () => {
    const html = renderPage('tagged.md', { tagged: true });
    for (const label of ['Blocked', 'Done', 'TODO', 'WIP']) expect(html).toContain(`>${label}</h2>`);
    expect(html).toContain('4 uses on 4 pages');
    expect(html).toContain('href="/products/api.md#refunds"');
    expect(html).toContain('href="/products/sub/guide.md#setup"');
    expect(html).toContain('>Payments API</a>');
    expect(html).not.toContain('inside code');
  });

  it('counts a tag once per line and merges labels case-insensitively', () => {
    const html = renderPage('tagged.md', { tagged: { include: ['todo'] } });
    expect(html).toContain('4 uses on 4 pages');
    expect(html).not.toContain('>Done</h2>');
  });

  it('applies exclude after include', () => {
    const html = renderPage('tagged.md', { tagged: { include: ['todo', 'wip'], exclude: ['TODO'] } });
    expect(html).toContain('>WIP</h2>');
    expect(html).not.toContain('>TODO</h2>');
  });

  it('limits pages to the listed folders, including subfolders', () => {
    const html = renderPage('products/tagged.md', { tagged: { folders: ['products'] } });
    expect(html).toContain('/products/api.md');
    expect(html).toContain('/products/sub/guide.md');
    expect(html).not.toContain('/ops/runbook.md');
    expect(html).not.toContain('>Blocked</h2>');
  });

  it('supports page-relative folders', () => {
    const html = renderPage('products/tagged.md', { tagged: { folders: ['./sub'] } });
    expect(html).toContain('/products/sub/guide.md');
    expect(html).not.toContain('/products/api.md');
  });

  it('keeps page text literal: no HTML or Vue interpolation leaks through', () => {
    const html = renderPage('tagged.md', { tagged: { include: ['done'] } });
    expect(html).toContain('<span v-pre>Retry policy {{ 1 + 1 }} &lt;b&gt;</span>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
  });

  it('says so when nothing matches', () => {
    expect(renderPage('tagged.md', { tagged: { include: ['nope'] } })).toContain('No tagged content found.');
  });

  it('puts the list at the placeholder, otherwise after the page content', () => {
    const placed = renderPage('tagged.md', { tagged: { include: ['wip'] } }, '# T\n\n<!-- tagged-pages -->\n\nAfter\n');
    expect(placed.indexOf('>WIP</h2>')).toBeLessThan(placed.indexOf('After'));
    const appended = renderPage('tagged.md', { tagged: { include: ['wip'] } }, '# T\n\nBefore\n');
    expect(appended.indexOf('Before')).toBeLessThan(appended.indexOf('>WIP</h2>'));
  });

  it('never lists other tagged-pages pages', () => {
    write('products/tagged.md', '---\ntagged: true\n---\n# Master\n\n((tag|only-on-master))\n');
    expect(renderPage('tagged.md', { tagged: true })).not.toContain('only-on-master');
  });

  it('does nothing without frontmatter config or outside VitePress', () => {
    expect(renderPage('tagged.md', {})).toBe('<h1>Master</h1>\n');
    const plain = new MarkdownIt({ html: true }).use(markdownTags).render('# Master\n');
    expect(plain).toBe('<h1>Master</h1>\n');
  });

  it('changes the fingerprint when a page is edited', () => {
    const before = fingerprintTaggedSource(root);
    write('ops/runbook.md', '# Runbook\n\nchanged and longer ((tag|TODO))\n');
    expect(fingerprintTaggedSource(root)).not.toBe(before);
  });
});
