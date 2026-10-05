import type { MarkdownIt, StateCore } from 'markdown-it';
import path from 'node:path';
import { applyTaggedPages, resolveTaggedPagesConfig } from './taggedPages.js';
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
 *
 * A page whose frontmatter has a `tagged` key also gets a generated list of
 * every tag used across the site (see the README). That needs VitePress's
 * `env.path`, `env.relativePath` and `env.frontmatter`, so it is skipped
 * under plain markdown-it.
 */
export function markdownTags(md: MarkdownIt, options: MarkdownTagsOptions = {}): void {
  md.core.ruler.before('normalize', 'markdown_tags', (state: StateCore) => {
    state.src = transformTags(withTaggedPages(state), options);
  });
}

function withTaggedPages({ src, env }: StateCore): string {
  const config = resolveTaggedPagesConfig(env?.frontmatter);
  if (!config || typeof env.path !== 'string' || typeof env.relativePath !== 'string') return src;

  // `env.path` is absolute and `env.relativePath` is relative to the source directory.
  const sourceDirectory = path.resolve(env.path, ...env.relativePath.split('/').map(() => '..'));
  return applyTaggedPages(src, config, sourceDirectory, env.relativePath);
}
