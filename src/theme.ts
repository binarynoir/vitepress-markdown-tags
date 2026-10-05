import type { App } from 'vue';
import { DEFAULT_COMPONENT_NAME } from './constants.js';
import { MarkdownTag } from './MarkdownTag.js';
import type { MarkdownTagsOptions } from './types.js';

/**
 * Registers the tag component globally. Call it from your theme's
 * `enhanceApp`, with the same `componentName` given to `withMarkdownTags`.
 *
 * ```ts
 * // .vitepress/theme/index.ts
 * import DefaultTheme from 'vitepress/theme';
 * import { registerMarkdownTags } from '@binarynoir/vitepress-markdown-tags/theme';
 * import '@binarynoir/vitepress-markdown-tags/style.css';
 *
 * export default {
 *   extends: DefaultTheme,
 *   enhanceApp({ app }) {
 *     registerMarkdownTags(app);
 *   },
 * };
 * ```
 */
export function registerMarkdownTags(app: App, options: MarkdownTagsOptions = {}): void {
  app.component(options.componentName ?? DEFAULT_COMPONENT_NAME, MarkdownTag);
}

export { MarkdownTag };
