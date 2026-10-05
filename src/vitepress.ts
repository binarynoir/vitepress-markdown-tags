import type { UserConfig } from 'vitepress';
import type { MarkdownIt } from 'markdown-it';
import type { Plugin } from 'vite';
import { markdownTags } from './plugin.js';
import { fingerprintTaggedSource, indexTaggedSource } from './taggedPages.js';
import { stripTags } from './transformTags.js';
import type { WithMarkdownTagsOptions } from './types.js';

const FRONTMATTER_BLOCK = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---/;

function hasTaggedFrontmatter(source: string): boolean {
  const frontmatter = FRONTMATTER_BLOCK.exec(source)?.[1];
  return frontmatter !== undefined && /^tagged[ \t]*:/m.test(frontmatter);
}

/**
 * Keeps tagged-pages pages fresh in `vitepress dev`. VitePress caches a page's
 * rendered output by its own source, so editing another page would leave the
 * list stale. This appends a fingerprint of the site's Markdown to those pages
 * (busting the cache) and re-renders them whenever any page changes.
 */
export function taggedPagesVitePlugin(): Plugin {
  let sourceDirectory = '';
  return {
    name: 'vitepress-markdown-tags:tagged-pages',
    enforce: 'pre',
    configResolved(config) {
      sourceDirectory = (config as { vitepress?: { srcDir?: string } }).vitepress?.srcDir ?? '';
    },
    transform(code, id) {
      if (!sourceDirectory || !id.endsWith('.md') || !hasTaggedFrontmatter(code)) return null;
      return { code: `${code}\n<!-- markdown-tags:${fingerprintTaggedSource(sourceDirectory)} -->\n`, map: null };
    },
    configureServer(server) {
      // Vite only calls handleHotUpdate for edits; a page added or deleted changes the lists too.
      const refresh = (file: string) => {
        if (!sourceDirectory || !file.endsWith('.md')) return;
        for (const page of indexTaggedSource(sourceDirectory).filter((indexed) => indexed.isTaggedPage)) {
          for (const module of server.moduleGraph.getModulesByFile(page.absolutePath) ?? []) {
            server.moduleGraph.invalidateModule(module);
          }
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('unlink', refresh);
    },
    handleHotUpdate({ file, modules, server }) {
      if (!sourceDirectory || !file.endsWith('.md')) return;
      const taggedPages = indexTaggedSource(sourceDirectory).filter((page) => page.isTaggedPage);
      const affected = taggedPages
        .filter((page) => page.absolutePath !== file)
        .flatMap((page) => [...(server.moduleGraph.getModulesByFile(page.absolutePath) ?? [])]);
      return affected.length ? [...modules, ...affected] : undefined;
    },
  };
}

/**
 * Wraps a VitePress config with tag syntax support, the same way
 * `withGlossary` from `markdown-it-glossary` does for tooltips.
 *
 * ```ts
 * // .vitepress/config.mts
 * import { defineConfig } from 'vitepress';
 * import { withMarkdownTags } from '@binarynoir/vitepress-markdown-tags/vitepress';
 *
 * export default withMarkdownTags(defineConfig({ /* ...your config... *\/ }));
 * ```
 *
 * An existing `markdown.config` or `transformPageData` is not replaced: this
 * wrapper runs first, then calls yours with the same arguments, so it composes
 * with other `withX()` wrappers in any order.
 */
export function withMarkdownTags(config: UserConfig, options: WithMarkdownTagsOptions = {}): UserConfig {
  const { stripFromTitles = true, ...pluginOptions } = options;

  config.markdown ??= {};
  const existingMarkdownConfig = config.markdown.config ?? (() => {});
  config.markdown.config = (md) => {
    // VitePress 2 types this callback against `markdown-it-async`'s MarkdownIt,
    // a structural superset of plain markdown-it's; the cast bridges the two.
    markdownTags(md as unknown as MarkdownIt, pluginOptions);
    existingMarkdownConfig(md);
  };

  config.vite ??= {};
  config.vite.plugins = [...(config.vite.plugins ?? []), taggedPagesVitePlugin()];

  if (stripFromTitles) {
    const existingTransformPageData = config.transformPageData;
    config.transformPageData = (pageData, context) => {
      if (typeof pageData.title === 'string') pageData.title = stripTags(pageData.title);
      if (typeof pageData.frontmatter?.title === 'string') {
        pageData.frontmatter.title = stripTags(pageData.frontmatter.title);
      }
      return existingTransformPageData?.(pageData, context);
    };
  }

  return config;
}
