# vitepress-markdown-tags

[![npm version](https://img.shields.io/npm/v/@binarynoir/vitepress-markdown-tags.svg)](https://www.npmjs.com/package/@binarynoir/vitepress-markdown-tags)
[![CI](https://github.com/binarynoir/vitepress-markdown-tags/actions/workflows/ci.yml/badge.svg)](https://github.com/binarynoir/vitepress-markdown-tags/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@binarynoir/vitepress-markdown-tags.svg)](LICENSE)

A [VitePress 2](https://vitepress.dev) plugin for inline status tags. Write
`((tag|Done|green))` in Markdown and get a styled badge, without touching HTML.
Code blocks and inline code are left exactly as written, so you can document the
syntax itself.

## What this does

```md
# Payments API ((tag|WIP))

Checkout ((tag|Done)) · Refunds ((tag|In review|orange)) · Webhooks ((<tag|v2|#7a5add|#fff))
```

Each tag becomes a `<MarkdownTag>` Vue component. A few labels pick their own
color (`Done` is green, `Blocked` is red); anything else is grey unless you give
it a color.

## Install

```sh
npm install @binarynoir/vitepress-markdown-tags
```

## Usage

Three small pieces, one for each place VitePress needs to know about tags.

**1. Config** registers the plugin in VitePress's own `markdown.config` hook,
the same place you'd add any other markdown-it plugin. `transformPageData`
keeps the tag syntax out of page titles:

```ts
// .vitepress/config.mts
import { defineConfig } from 'vitepress';
import { markdownTags, stripTags } from '@binarynoir/vitepress-markdown-tags';

export default defineConfig({
  markdown: {
    config(md) {
      md.use(markdownTags);
    },
  },

  transformPageData(pageData) {
    if (typeof pageData.title === 'string') {
      pageData.title = stripTags(pageData.title);
    }
    if (typeof pageData.frontmatter?.title === 'string') {
      pageData.frontmatter.title = stripTags(pageData.frontmatter.title);
    }
  },
});
```

Other markdown-it plugins can share the same `config(md)` function.

Prefer wrapping your config? `withMarkdownTags` does both of the above in one
call, the same way `withMermaid` or `withGlossary` do:

```ts
import { withMarkdownTags } from '@binarynoir/vitepress-markdown-tags/vitepress';

export default withMarkdownTags(
  defineConfig({
    // ...your normal config
  }),
);
```

**2. Theme** registers the component and loads its stylesheet:

```ts
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import { registerMarkdownTags } from '@binarynoir/vitepress-markdown-tags/theme';
import '@binarynoir/vitepress-markdown-tags/style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    registerMarkdownTags(app);
  },
};
```

**3. Markdown**: write tags anywhere inline: paragraphs, headings, lists, tables.

`withMarkdownTags` will not clobber a `markdown.config` or `transformPageData`
you already have, including ones set by another `withX()` wrapper. It installs
its own first, then calls yours with the same arguments.

### Plain markdown-it

```ts
import MarkdownIt from 'markdown-it';
import { markdownTags } from '@binarynoir/vitepress-markdown-tags';

const md = new MarkdownIt({ html: true }).use(markdownTags);
```

The plugin emits inline HTML, so `html: true` is required (VitePress enables it
by default). With it off, markdown-it escapes the tag and shows the markup as text.

## Syntax

```txt
((tag|label))
((tag|label|background))
((tag|label|background|foreground))
((<tag|label|background|foreground))     arrow style
```

| Part         | Meaning                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| `label`      | Text shown in the tag. Required; a blank label leaves the text as written.                   |
| `background` | A palette name (`grey`, `green`, `yellow`, `orange`, `blue`, `purple`, `red`) or a hex code. |
| `foreground` | Text color as a hex code (`#fff`). Named colors are ignored here.                            |
| `((<tag`     | The leading `<` renders the tag with a pointed, price-tag shape.                             |

- `/` works as the separator too (`((tag/Done/green))`), but use one or the
  other within a tag. Because both are separators, a label can't contain `|` or `/`.
- Colors are case-insensitive for names. An invalid color is dropped and the tag
  still renders with its default color.
- A tag must sit on one line.

### Preset labels

When no background is given, these labels (matched case-insensitively) choose a color:

| Color  | Labels                                       |
| ------ | -------------------------------------------- |
| grey   | `todo`, `planned`                            |
| orange | `doing`, `in-progress`                       |
| green  | `done`, `tip`                                |
| blue   | `on-hold`, `tbd`, `proposed`, `draft`, `wip` |
| purple | `mvp`                                        |
| yellow | `warn`, `warning`                            |
| red    | `blocked`, `canceled`, `error`               |

`tbd`, `mvp`, `wip` and `draft` also render in capitals. An explicit background always
beats the preset color.

### Code is left alone

Tag syntax inside fenced blocks (` ``` ` or `~~~`, including unclosed ones) and
inline code spans is never transformed, so this documents itself:

```md
Write `((tag|Done))` to get a tag.
```

Indented (four-space) code blocks are not detected; use a fenced block.

## Tagged pages

Tags are scattered across pages, so finding every `((tag|TODO))` by hand is
tedious. Add a `tagged` key to any page's frontmatter and that page lists every
tag used across the site, grouped by tag, with a link to the exact section that
uses it. There is nothing to add to `config.mts`.

```md
---
title: All tags
tagged: true
---

# All tags
```

Make as many of these pages as you like, each with its own settings:

```md
---
# products/tagged-pages.md: only TODO and WIP, only pages under products/
tagged:
  include: [todo, wip]
  folders: [products]
---
```

| Key       | Default    | Description                                                                                                                                             |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | all tags   | Only list these tag labels. A list, or a single string.                                                                                                 |
| `exclude` | none       | Never list these labels. Wins over `include`.                                                                                                           |
| `folders` | whole site | Only scan pages inside these folders, subfolders included. Relative to the docs root (`products`); start with `./` or `../` to be relative to the page. |

- Labels match case-insensitively, so `TODO` and `todo` are one group.
- The list goes after the page's own content, or in place of a
  `<!-- tagged-pages -->` comment if you put one in.
- Pages that have a `tagged` key are never scanned, so master pages don't list each other.
- Tags in code blocks and inline code are ignored, as everywhere else.
- It works through `withMarkdownTags`, or `markdownTags` plus
  `taggedPagesVitePlugin()` from `/vitepress` in `vite.plugins`. The plugin
  keeps these pages current in `vitepress dev`; builds don't need it.
- `rewrites` are not followed: links use each file's path under the docs root.

## Options

Both `markdownTags(md, options)` and `withMarkdownTags(config, options)` take:

| Option          | Default         | Description                                                                     |
| --------------- | --------------- | ------------------------------------------------------------------------------- |
| `componentName` | `'MarkdownTag'` | Component the syntax compiles to. Pass the same name to `registerMarkdownTags`. |

`withMarkdownTags` also accepts:

| Option            | Default | Description                                                                                            |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `stripFromTitles` | `true`  | Remove tag syntax from each page's `title` and `frontmatter.title`, so it doesn't leak into `<title>`. |

## Styling

`style.css` is plain CSS. Each variant sets one custom property, so overriding a
color is a one-liner:

```css
.md-tag--green {
  --md-tag-color: #2e8555;
}
```

Classes: `.md-tag`, `.md-tag--<color>`, `.md-tag--arrow`, `.md-tag--uppercase`. A hex
background is applied as `--md-tag-color` inline, so it works for arrow tags too.

## API

```ts
import { markdownTags, transformTags, stripTags } from '@binarynoir/vitepress-markdown-tags';

transformTags(source: string, options?: MarkdownTagsOptions): string
stripTags(text: string): string
```

`transformTags` is the pure function the plugin runs on each page's source;
`stripTags` removes the syntax from plain text (titles, search entries) and
tidies the leftover spaces. The `./theme` entry also exports the `MarkdownTag`
component itself.

## Titles in sidebars and navbars

`stripFromTitles` cleans the page's own title. Sidebar and navbar plugins that
read headings themselves (such as
[`vitepress-auto-sidebar`](https://github.com/binarynoir/vitepress-auto-sidebar)
and [`vitepress-auto-navbar`](https://github.com/binarynoir/vitepress-auto-navbar))
see the raw `# Title ((tag|WIP))` text; give those pages a `title` frontmatter
or a `.sidebar` / `.nav` title override if you don't want the syntax shown there.

Those plugins build the sidebar and navbar when the config loads, before
VitePress renders anything, so `transformPageData` (and therefore
`stripFromTitles`) never sees their titles. If you'd rather keep the tags in your
headings and clean the generated menus instead, run the result through
`stripTags`:

```ts
import { stripTags } from '@binarynoir/vitepress-markdown-tags';
import { generateNav } from '@binarynoir/vitepress-auto-navbar';
import { generateSidebar } from '@binarynoir/vitepress-auto-sidebar';

// Strip tag syntax from every `text` field in a generated nav/sidebar tree.
const cleanTitles = <T>(items: T): T =>
  JSON.parse(
    JSON.stringify(items, (key, value) => (key === 'text' && typeof value === 'string' ? stripTags(value) : value)),
  );

export default defineConfig({
  themeConfig: {
    nav: cleanTitles(generateNav(docsRoot)),
    sidebar: cleanTitles(generateSidebar(docsRoot)),
  },
});
```

Pair this with the `transformPageData` hook above (or `withMarkdownTags`) so the
page `<title>` is clean too.

## Releasing

Releases are tag-triggered. From a clean `main` that's in sync with
`origin/main`:

```sh
npm run release:patch   # or release:minor / release:major
```

This runs typecheck/lint/test/build locally, then `npm version <bump>` and
`git push --follow-tags`. Pushing the tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which re-runs
the checks, publishes to npm, and creates a GitHub release.

## License

MIT
