import type { UserConfig } from 'vitepress';
import type { MarkdownIt } from 'markdown-it';
import { markdownTags } from './plugin.js';
import { stripTags } from './transformTags.js';
import type { WithMarkdownTagsOptions } from './types.js';

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
