import { DEFAULT_COMPONENT_NAME } from './constants.js';
import { escapeHtml } from './util.js';
import { normalizeBackgroundColor, normalizeForegroundColor } from './color.js';
import type { MarkdownTagsOptions } from './types.js';

/** A fenced code block, closed or (as CommonMark allows) running to the end of the document. */
export const FENCED_CODE =
  /^[ \t]*(?<fence>`{3,}(?![^\n]*`)|~{3,})[^\n]*(?:\n[\s\S]*?^[ \t]*\k<fence>[`~]*[ \t]*\r?$|[\s\S]*$)/m;

/** An inline code span, including double-backtick spans that contain a single backtick. */
export const INLINE_CODE = /(?<!`)(?<tick>`+)(?!`)[^\n]*?[^`\n]\k<tick>(?!`)/;

/**
 * `((tag|label|bgcolor|fgcolor))`. The separator may be `|` or `/` but must be
 * used consistently, and a leading `<` (`((<tag|...))`) selects the arrow style.
 */
export const TAG_SYNTAX =
  /\(\((?<arrow><)?tag(?<separator>[|/])(?<label>[^|/)\r\n]*)(?:\k<separator>(?<background>[^|/)\r\n]*))?(?:\k<separator>(?<foreground>[^|/)\r\n]*))?\)\)/;

/**
 * Code is matched alongside tags so that one left-to-right pass can skip it:
 * whatever matches first at a position wins, and a match that is code is
 * returned unchanged.
 */
const CODE_OR_TAG = new RegExp(`${FENCED_CODE.source}|${INLINE_CODE.source}|${TAG_SYNTAX.source}`, 'gm');
const TAG_ONLY = new RegExp(TAG_SYNTAX.source, 'g');

export interface TagGroups {
  arrow?: string;
  label?: string;
  background?: string;
  foreground?: string;
}

function renderTag(groups: TagGroups, componentName: string): string | null {
  const label = groups.label?.trim() ?? '';
  if (!label) return null;

  const attributes = [`label="${escapeHtml(label)}"`];
  const background = normalizeBackgroundColor(groups.background?.trim());
  const foreground = normalizeForegroundColor(groups.foreground?.trim());
  if (background) attributes.push(`bgcolor="${background}"`);
  if (foreground) attributes.push(`fgcolor="${foreground}"`);
  if (groups.arrow) attributes.push('arrow');

  return `<${componentName} ${attributes.join(' ')}></${componentName}>`;
}

/**
 * Replaces tag syntax in Markdown source with component tags. Fenced code
 * blocks and inline code are left exactly as written, and so are tags with a
 * blank label. Invalid colors are dropped rather than emitted.
 */
export function transformTags(source: string, options: MarkdownTagsOptions = {}): string {
  const { componentName = DEFAULT_COMPONENT_NAME } = options;

  return source.replace(CODE_OR_TAG, (match, ...args) => {
    const groups = args.at(-1) as TagGroups;
    if (groups.label === undefined) return match;
    return renderTag(groups, componentName) ?? match;
  });
}

/**
 * Removes tag syntax from plain text such as a page title. Spaces left behind
 * by a removed tag are collapsed and the result is trimmed.
 */
export function stripTags(text: string): string {
  const stripped = text.replace(TAG_ONLY, (match, ...args) => {
    const groups = args.at(-1) as TagGroups;
    return groups.label?.trim() ? '' : match;
  });
  return stripped === text ? text : stripped.replace(/[ \t]{2,}/g, ' ').trim();
}
