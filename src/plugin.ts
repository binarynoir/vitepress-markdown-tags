import type { MarkdownIt, StateCore } from 'markdown-it';
import { transformTags } from './transformTags.js';
import type { MarkdownTagsOptions } from './types.js';

/**
 * A markdown-it plugin that turns `((tag|Done|green))` into a tag component.
 *
 * ```ts
 * import MarkdownIt from 'markdown-it';
 * import { markdownTags } from '@binarynoir/vitepress-markdown-tags';
 *
 * const md = new MarkdownIt({ html: true }).use(markdownTags);
 * ```
 *
 * Runs before markdown-it's `normalize` rule, on the raw source, so the
 * generated component tags reach the Markdown parser as inline HTML. That
 * means `html` must be enabled, which it is by default in VitePress.
 */
export function markdownTags(md: MarkdownIt, options: MarkdownTagsOptions = {}): void {
  md.core.ruler.before('normalize', 'markdown_tags', (state: StateCore) => {
    state.src = transformTags(state.src, options);
  });
}
