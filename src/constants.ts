/** Named background colors a tag can use. Anything else must be a hex code. */
export const TAG_COLORS = ['grey', 'green', 'yellow', 'orange', 'blue', 'purple', 'red'] as const;

export type TagColor = (typeof TAG_COLORS)[number];

/**
 * Labels that pick their own color when no background is given, e.g.
 * `((tag|Done))` is green. An explicit background always wins.
 */
export const TAG_PRESET_COLORS = {
  todo: 'grey',
  planned: 'grey',
  doing: 'orange',
  'in-progress': 'orange',
  done: 'green',
  tip: 'green',
  'on-hold': 'blue',
  tbd: 'blue',
  proposed: 'blue',
  draft: 'blue',
  wip: 'blue',
  mvp: 'purple',
  warn: 'yellow',
  warning: 'yellow',
  blocked: 'red',
  canceled: 'red',
  error: 'red',
} as const satisfies Record<string, TagColor>;

export type TagPreset = keyof typeof TAG_PRESET_COLORS;

/** Presets that render in capitals, like `((tag|wip))` → "WIP". */
export const UPPERCASE_TAG_PRESETS: readonly TagPreset[] = ['tbd', 'mvp', 'wip', 'draft'];

/** Name of the Vue component the Markdown syntax compiles to. */
export const DEFAULT_COMPONENT_NAME = 'MarkdownTag';
