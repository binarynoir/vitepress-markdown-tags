# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- README: replace the plugin list with a generated More from BinaryNoir section, and use a BinaryNoir logo that shows on light and dark backgrounds

## [0.2.8] - 2026-10-15

### Fixed

- Tagged pages now find Markdown in symlinked folders and files under the source directory. Links that point back up the tree and broken links are skipped.

## [0.2.7] - 2026-10-15

### Changed

- README: add Sidebar Accordion to the list of BinaryNoir plugins

## [0.2.6] - 2026-10-14

### Changed

- README: list the Exclude, README Index and Broken Links plugins under More from BinaryNoir, and point documentation and website links to binarynoir.tech

## [0.2.5] - 2026-10-13

### Changed

- README: remove the binarynoir.github.io badge; the binarynoir.tech website badge remains

## [0.2.4] - 2026-10-13

### Changed

- README: add a Feedback and support section with links to report a bug, request a feature, or browse open issues
- README: add a More from BinaryNoir section with the BinaryNoir logo and links to the other plugins and command-line tools on [binarynoir.github.io](https://binarynoir.github.io)
- README: add a binarynoir.github.io badge

## [0.2.3] - 2026-10-08

### Changed

- Add a link to the documentation site in README

## [0.2.2] - 2026-10-06

### Changed

- Add support, author, and acknowledgments sections to README

## [0.2.1] - 2026-10-06

### Changed

- Add support and website badges to README

## [0.2.0] - 2026-10-05

### Added

- Tagged pages: a page with `tagged` frontmatter (`include`, `exclude`, `folders`) lists every tag used across the site, grouped by tag, with links to the sections that use them.
- `taggedPagesVitePlugin`, added by `withMarkdownTags`, keeps those pages up to date in `vitepress dev`.

## [0.1.2] - 2026-10-05

### Changed

- README: configure `markdownTags` through VitePress's own `markdown.config` hook (with `transformPageData` for titles), with `withMarkdownTags` documented as the shortcut.
- README: recommend running `generateNav` / `generateSidebar` output through `stripTags`, since those plugins read titles at config time and `transformPageData` never sees them.

## [0.1.1] - 2026-10-05

### Changed

- Downgrade esbuild from 0.27.7 to 0.27.2

## [0.1.0] - 2026-10-05

### Added

- initial release: `markdownTags` markdown-it plugin, `withMarkdownTags` VitePress wrapper, and the `MarkdownTag` component with its stylesheet
