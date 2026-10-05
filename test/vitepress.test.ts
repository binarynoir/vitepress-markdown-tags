import MarkdownIt from 'markdown-it';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { taggedPagesVitePlugin, withMarkdownTags } from '../src/vitepress.js';
import type { PageData, UserConfig } from 'vitepress';

// VitePress 2 types `markdown.config` against `markdown-it-async`'s MarkdownIt,
// a structural superset of plain markdown-it's. A real `markdown-it` instance
// is fine at runtime, so these helpers just bridge the two types.
type Md = InstanceType<typeof MarkdownIt>;

function runMarkdownConfig(config: UserConfig, md: Md): void {
  (config.markdown!.config as unknown as (md: Md) => void)(md);
}

type TransformPageData = (pageData: PageData, context: unknown) => unknown;

function runTransformPageData(config: UserConfig, pageData: Partial<PageData>): unknown {
  return (config.transformPageData as unknown as TransformPageData)(pageData as PageData, {});
}

describe('withMarkdownTags', () => {
  describe('markdown.config', () => {
    it('adds a markdown.config when the input config has none', () => {
      const config = withMarkdownTags({} as UserConfig);
      const md = new MarkdownIt({ html: true });
      runMarkdownConfig(config, md);
      expect(md.render('((tag|Done))')).toContain('<MarkdownTag label="Done">');
    });

    it('does not replace an existing markdown.config: it still runs, with the same md', () => {
      const userConfig = vi.fn();
      const config = withMarkdownTags({ markdown: { config: userConfig } } as unknown as UserConfig);
      const md = new MarkdownIt({ html: true });
      runMarkdownConfig(config, md);

      expect(userConfig).toHaveBeenCalledTimes(1);
      expect(userConfig).toHaveBeenCalledWith(md);
      expect(md.render('((tag|Done))')).toContain('<MarkdownTag');
    });

    it('installs the plugin before the existing config runs', () => {
      let renderedInsideUserConfig = '';
      const config = withMarkdownTags({
        markdown: {
          config: (instance: Md) => {
            renderedInsideUserConfig = instance.render('((tag|x))');
          },
        },
      } as unknown as UserConfig);
      runMarkdownConfig(config, new MarkdownIt({ html: true }));
      expect(renderedInsideUserConfig).toContain('<MarkdownTag label="x">');
    });

    it('preserves other markdown options', () => {
      const config = withMarkdownTags({ markdown: { lineNumbers: true } } as UserConfig);
      expect(config.markdown?.lineNumbers).toBe(true);
    });

    it('passes componentName through to the plugin', () => {
      const config = withMarkdownTags({} as UserConfig, { componentName: 'Badge' });
      const md = new MarkdownIt({ html: true });
      runMarkdownConfig(config, md);
      expect(md.render('((tag|Done))')).toContain('<Badge label="Done"></Badge>');
    });

    it('returns the same config object it was given', () => {
      const input = {} as UserConfig;
      expect(withMarkdownTags(input)).toBe(input);
    });
  });

  describe('transformPageData', () => {
    it('strips tag syntax from title and frontmatter.title', () => {
      const config = withMarkdownTags({} as UserConfig);
      const pageData = { title: 'Guide ((tag|New))', frontmatter: { title: 'Guide ((tag|New|red))' } };
      runTransformPageData(config, pageData);
      expect(pageData.title).toBe('Guide');
      expect(pageData.frontmatter.title).toBe('Guide');
    });

    it('tolerates a missing title and missing frontmatter title', () => {
      const config = withMarkdownTags({} as UserConfig);
      expect(() => runTransformPageData(config, { title: '', frontmatter: {} })).not.toThrow();
      expect(() => runTransformPageData(config, { frontmatter: undefined })).not.toThrow();
    });

    it('leaves non-string titles alone', () => {
      const config = withMarkdownTags({} as UserConfig);
      const pageData = { title: 'T', frontmatter: { title: 42 } };
      runTransformPageData(config, pageData);
      expect(pageData.frontmatter.title).toBe(42);
    });

    it('does not replace an existing transformPageData: it runs after, and its result is returned', () => {
      const existing = vi.fn((pageData: PageData) => ({ description: `seen: ${pageData.title}` }));
      const config = withMarkdownTags({ transformPageData: existing } as unknown as UserConfig);
      const pageData = { title: 'Guide ((tag|New))', frontmatter: {} };

      expect(runTransformPageData(config, pageData)).toEqual({ description: 'seen: Guide' });
      expect(existing).toHaveBeenCalledTimes(1);
    });

    it('does not install transformPageData when stripFromTitles is false', () => {
      expect(withMarkdownTags({} as UserConfig, { stripFromTitles: false }).transformPageData).toBeUndefined();
    });

    it('keeps an existing transformPageData untouched when stripFromTitles is false', () => {
      const existing = vi.fn();
      const config = withMarkdownTags({ transformPageData: existing } as unknown as UserConfig, {
        stripFromTitles: false,
      });
      expect(config.transformPageData).toBe(existing);
    });
  });
});

describe('taggedPagesVitePlugin', () => {
  type Hooks = {
    configResolved: (config: unknown) => void;
    transform: (code: string, id: string) => { code: string } | null;
  };

  function createPlugin(): Hooks {
    const plugin = taggedPagesVitePlugin() as unknown as Hooks;
    plugin.configResolved({ vitepress: { srcDir: root } });
    return plugin;
  }

  const root = mkdtempSync(path.join(tmpdir(), 'tagged-plugin-'));
  writeFileSync(path.join(root, 'a.md'), '# A ((tag|x))\n');

  it('is added to the Vite config by withMarkdownTags', () => {
    const config = withMarkdownTags({ vite: { plugins: [{ name: 'existing' }] } } as UserConfig);
    expect(config.vite?.plugins).toHaveLength(2);
  });

  it('stamps only tagged-pages pages, and the stamp changes with the site content', () => {
    const plugin = createPlugin();
    const taggedSource = '---\ntagged: true\n---\n# Master\n';
    expect(plugin.transform('# Plain\n', 'a.md')).toBeNull();
    expect(plugin.transform(taggedSource, 'a.ts')).toBeNull();

    const first = plugin.transform(taggedSource, 'master.md')!.code;
    expect(first).toMatch(/<!-- markdown-tags:[0-9a-f]{12} -->/);
    writeFileSync(path.join(root, 'b.md'), '# B ((tag|y))\n');
    expect(plugin.transform(taggedSource, 'master.md')!.code).not.toBe(first);
  });
});
