import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { scanTags, type ScannedPage, type TagOccurrence } from './scanTags.js';

/** What a page's `tagged` frontmatter can say. Every field is optional. */
export interface TaggedPagesConfig {
  /** Only list these tag labels. Default: all. */
  include: string[];
  /** Never list these tag labels, even if included. */
  exclude: string[];
  /** Only scan pages inside these folders. Default: every page. */
  folders: string[];
}

/** Marker a page can use to say where the generated list goes. Without it the list is appended. */
export const TAGGED_PAGES_PLACEHOLDER = '<!-- tagged-pages -->';

export const TAGGED_FRONTMATTER_KEY = 'tagged';

export interface IndexedPage extends ScannedPage {
  /** Path from the source directory, with forward slashes: `products/api.md`. */
  relativePath: string;
  absolutePath: string;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  page: ScannedPage;
}

const scanCache = new Map<string, CacheEntry>();

function toStringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Reads the `tagged` frontmatter value: `true` for the defaults, or an object
 * with `include`, `exclude` and `folders` (each a list or a single string).
 * Returns `null` when the page is not a tagged-pages page.
 */
export function resolveTaggedPagesConfig(frontmatter: unknown): TaggedPagesConfig | null {
  const value = (frontmatter as Record<string, unknown> | undefined)?.[TAGGED_FRONTMATTER_KEY];
  if (!value) return null;
  const options = typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    include: toStringList(options.include),
    exclude: toStringList(options.exclude),
    folders: toStringList(options.folders),
  };
}

function listMarkdownFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listMarkdownFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}

function toFallbackTitle(relativePath: string): string {
  const parts = relativePath.replace(/\.md$/, '').split('/');
  const name = parts.at(-1) === 'index' && parts.length > 1 ? parts.at(-2)! : parts.at(-1)!;
  return name.replace(/[-_]+/g, ' ');
}

/**
 * Scans every Markdown file under `sourceDirectory`. Results are cached per
 * file and reused until its modification time or size changes.
 */
export function indexTaggedSource(sourceDirectory: string): IndexedPage[] {
  const pages: IndexedPage[] = [];
  const present = new Set<string>();

  for (const absolutePath of listMarkdownFiles(sourceDirectory).sort()) {
    present.add(absolutePath);
    const stats = statSync(absolutePath);
    let entry = scanCache.get(absolutePath);
    const relativePath = path.relative(sourceDirectory, absolutePath).split(path.sep).join('/');
    if (!entry || entry.mtimeMs !== stats.mtimeMs || entry.size !== stats.size) {
      const page = scanTags(readFileSync(absolutePath, 'utf8'), toFallbackTitle(relativePath));
      entry = { mtimeMs: stats.mtimeMs, size: stats.size, page };
      scanCache.set(absolutePath, entry);
    }
    pages.push({ ...entry.page, relativePath, absolutePath });
  }

  for (const cached of scanCache.keys()) {
    if (cached.startsWith(sourceDirectory + path.sep) && !present.has(cached)) scanCache.delete(cached);
  }
  return pages;
}

/** Changes whenever any Markdown file under the directory is added, removed or edited. */
export function fingerprintTaggedSource(sourceDirectory: string): string {
  const hash = createHash('sha1');
  for (const page of indexTaggedSource(sourceDirectory)) {
    const { mtimeMs, size } = statSync(page.absolutePath);
    hash.update(`${page.relativePath}:${mtimeMs}:${size}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}

/**
 * Folder entries are relative to the source directory (`products`). One that
 * starts with `./` or `../` is relative to the folder of the page that lists it.
 */
export function resolveFolders(folders: string[], pageRelativePath: string): string[] {
  return folders.map((folder) => {
    const resolved = /^\.\.?(\/|$)/.test(folder)
      ? path.posix.join(path.posix.dirname(pageRelativePath), folder)
      : path.posix.normalize(folder);
    return resolved.replace(/^\/+|\/+$/g, '').replace(/^\.$/, '');
  });
}

function isInFolders(relativePath: string, folders: string[]): boolean {
  return folders.length === 0 || folders.some((folder) => !folder || relativePath.startsWith(`${folder}/`));
}

interface TagGroup {
  label: string;
  pages: Map<IndexedPage, TagOccurrence[]>;
  count: number;
}

/** Groups matching tags by label (case-insensitive), alphabetically. Master pages are never scanned. */
export function groupTags(pages: IndexedPage[], config: TaggedPagesConfig, pageRelativePath: string): TagGroup[] {
  const include = new Set(config.include.map((label) => label.toLowerCase()));
  const exclude = new Set(config.exclude.map((label) => label.toLowerCase()));
  const folders = resolveFolders(config.folders, pageRelativePath);
  const groups = new Map<string, TagGroup>();

  for (const page of pages) {
    if (page.isTaggedPage || !isInFolders(page.relativePath, folders)) continue;
    for (const occurrence of page.occurrences) {
      const key = occurrence.label.toLowerCase();
      if ((include.size && !include.has(key)) || exclude.has(key)) continue;
      let group = groups.get(key);
      if (!group) groups.set(key, (group = { label: occurrence.label, pages: new Map(), count: 0 }));
      const list = group.pages.get(page) ?? [];
      list.push(occurrence);
      group.pages.set(page, list);
      group.count++;
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/**
 * Escapes text so it stays literal in Markdown and in VitePress's Vue
 * templates. Text with braces goes in a `v-pre` span, since Vue would otherwise
 * evaluate `{{ }}` even when the Markdown escaped it.
 */
function escapeMarkdown(text: string): string {
  const escaped = text
    .replace(/[\\`*_[\]#|~]/g, '\\$&')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return /[{}]/.test(escaped) ? `<span v-pre>${escaped}</span>` : escaped;
}

function toLink(text: string, relativePath: string, anchor = ''): string {
  const url = encodeURI(`/${relativePath}`).replace(/[()]/g, (character) => (character === '(' ? '%28' : '%29'));
  return `[${escapeMarkdown(text)}](${url}${anchor ? `#${encodeURI(anchor)}` : ''})`;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Renders grouped tags as Markdown: a heading per tag, then each page with links to the sections using it. */
export function renderTaggedPages(groups: TagGroup[]): string {
  if (groups.length === 0) return '_No tagged content found._\n';

  const lines: string[] = [];
  for (const group of groups) {
    lines.push(
      `## ${escapeMarkdown(group.label)}`,
      '',
      `${pluralize(group.count, 'use')} on ${pluralize(group.pages.size, 'page')}`,
      '',
    );
    for (const [page, occurrences] of group.pages) {
      lines.push(`- ${toLink(page.title, page.relativePath)}`);
      for (const { heading, anchor, context } of occurrences) {
        const where = heading ? toLink(heading, page.relativePath, anchor) : '';
        const detail = context ? escapeMarkdown(context) : '';
        const entry = [where, detail].filter(Boolean).join(': ');
        if (entry) lines.push(`  - ${entry}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Builds the Markdown for a tagged-pages page and puts it in `source`: at the
 * placeholder if there is one, otherwise after the page's own content.
 */
export function applyTaggedPages(
  source: string,
  config: TaggedPagesConfig,
  sourceDirectory: string,
  pageRelativePath: string,
): string {
  const generated = renderTaggedPages(groupTags(indexTaggedSource(sourceDirectory), config, pageRelativePath));
  return source.includes(TAGGED_PAGES_PLACEHOLDER)
    ? source.replace(TAGGED_PAGES_PLACEHOLDER, () => `\n${generated}\n`)
    : `${source.replace(/\s*$/, '')}\n\n${generated}`;
}
