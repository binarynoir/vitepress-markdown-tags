export interface MarkdownTagsOptions {
  /**
   * Name of the Vue component the tag syntax compiles to. It must match the
   * name the component is registered under (see `registerMarkdownTags`).
   * Default: `'MarkdownTag'`.
   */
  componentName?: string;
}

export interface WithMarkdownTagsOptions extends MarkdownTagsOptions {
  /**
   * Strip tag syntax from each page's `title` and `frontmatter.title`, so the
   * browser tab and search results don't show raw `((tag|...))` text.
   * Default: `true`.
   */
  stripFromTitles?: boolean;
}
