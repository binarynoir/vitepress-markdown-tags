import { FENCED_CODE, INLINE_CODE, TAG_SYNTAX, stripTags, type TagGroups } from './transformTags.js';

/** One use of a tag: the label as written, the section it sits in, and the line's text. */
export interface TagOccurrence {
  label: string;
  /** Text of the nearest heading above the tag, or `''` before the first heading. */
  heading: string;
  /** That heading's anchor (without `#`), or `''`. */
  anchor: string;
  /** The tag's line with tag syntax and list/quote markers removed; may be empty. */
  context: string;
}

export interface ScannedPage {
  title: string;
  /** Whether the page's frontmatter has a `tagged` key, i.e. it is a master page itself. */
  isTaggedPage: boolean;
  occurrences: TagOccurrence[];
}

const CODE = new RegExp(`${FENCED_CODE.source}|${INLINE_CODE.source}`, 'gm');
const FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const CUSTOM_ANCHOR = /[ \t]*\{#([^}\s]+)\}[ \t]*$/;
const LINE_PREFIX = /^[ \t]*(?:>[ \t]*)*(?:(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)?/;
const MAX_CONTEXT_LENGTH = 140;

// Same rules as VitePress's own heading slugs, so links land on the right section.
const CONTROL_CHARACTERS = /[\u0000-\u001f]/g;
const SPECIAL_CHARACTERS = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g;
const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugifyHeading(text: string): string {
  return text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(CONTROL_CHARACTERS, '')
    .replace(SPECIAL_CHARACTERS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();
}

/** Reads a plain `key: value` line out of a frontmatter block. */
function readFrontmatterValue(frontmatter: string, key: string): string | undefined {
  const line = new RegExp(`^${key}[ \\t]*:[ \\t]*(.*?)[ \\t]*$`, 'm').exec(frontmatter);
  return line?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
}

/** Heading text as VitePress slugs it: markdown links, emphasis and code marks reduced to their text. */
function toPlainHeadingText(text: string): string {
  return stripTags(text)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}

function toContext(line: string): string {
  const text = stripTags(line.replace(LINE_PREFIX, '')).replace(/\s+/g, ' ').trim();
  return text.length > MAX_CONTEXT_LENGTH ? `${text.slice(0, MAX_CONTEXT_LENGTH - 1).trimEnd()}…` : text;
}

/**
 * Finds every tag in a page's Markdown source, skipping code, and notes the
 * heading each one sits under. `fallbackTitle` is used when the page has
 * neither a `title` in its frontmatter nor a top-level heading.
 */
export function scanTags(source: string, fallbackTitle: string): ScannedPage {
  const frontmatter = FRONTMATTER.exec(source)?.[0] ?? '';
  const body = source.slice(frontmatter.length);

  // Blank out code (keeping line breaks) so tags and headings inside it are ignored.
  const visible = body.replace(CODE, (code) => code.replace(/[^\n]/g, ' '));
  const lines = body.split('\n');
  const visibleLines = visible.split('\n');

  let title = readFrontmatterValue(frontmatter, 'title') ?? '';
  const occurrences: TagOccurrence[] = [];
  const anchorCounts = new Map<string, number>();
  let heading = '';
  let anchor = '';

  visibleLines.forEach((visibleLine, index) => {
    const headingMatch = HEADING.exec(visibleLine);
    if (headingMatch) {
      const customAnchor = CUSTOM_ANCHOR.exec(headingMatch[2])?.[1];
      heading = toPlainHeadingText(headingMatch[2].replace(CUSTOM_ANCHOR, ''));
      if (headingMatch[1].length === 1 && !title) title = heading;

      // markdown-it-anchor appends -1, -2, ... to repeated slugs.
      const slug = customAnchor ?? slugifyHeading(heading);
      const seen = anchorCounts.get(slug) ?? 0;
      anchorCounts.set(slug, seen + 1);
      anchor = seen === 0 ? slug : `${slug}-${seen}`;
    }

    const seenOnLine = new Set<string>();
    for (const match of visibleLine.matchAll(new RegExp(TAG_SYNTAX.source, 'g'))) {
      const label = (match.groups as TagGroups).label?.trim() ?? '';
      if (!label || seenOnLine.has(label.toLowerCase())) continue;
      seenOnLine.add(label.toLowerCase());
      occurrences.push({
        label,
        heading,
        anchor,
        context: headingMatch ? '' : toContext(lines[index]),
      });
    }
  });

  return {
    title: stripTags(title) || fallbackTitle,
    isTaggedPage: /^tagged[ \t]*:/m.test(frontmatter),
    occurrences,
  };
}
