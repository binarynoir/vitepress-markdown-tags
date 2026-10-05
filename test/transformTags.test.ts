import { describe, expect, it } from 'vitest';
import { transformTags } from '../src/transformTags.js';

const tag = (attributes: string) => `<MarkdownTag ${attributes}></MarkdownTag>`;

describe('transformTags', () => {
  describe('syntax', () => {
    it('transforms a label-only tag', () => {
      expect(transformTags('((tag|Done))')).toBe(tag('label="Done"'));
    });

    it('transforms a tag with a background color', () => {
      expect(transformTags('((tag|Done|green))')).toBe(tag('label="Done" bgcolor="green"'));
    });

    it('transforms a tag with background and foreground colors', () => {
      expect(transformTags('((tag|Done|#7a5add|#fff))')).toBe(tag('label="Done" bgcolor="#7a5add" fgcolor="#fff"'));
    });

    it('accepts / as the separator', () => {
      expect(transformTags('((tag/Done/green))')).toBe(tag('label="Done" bgcolor="green"'));
    });

    it('requires one separator to be used throughout', () => {
      const mixed = '((tag|Done/green))';
      expect(transformTags(mixed)).toBe(mixed);
    });

    it('marks the arrow variant', () => {
      expect(transformTags('((<tag|Done))')).toBe(tag('label="Done" arrow'));
      expect(transformTags('((<tag/Done/blue))')).toBe(tag('label="Done" bgcolor="blue" arrow'));
    });

    it('trims whitespace around each part', () => {
      expect(transformTags('((tag| Done | green ))')).toBe(tag('label="Done" bgcolor="green"'));
    });

    it('transforms several tags in one line, leaving surrounding text alone', () => {
      expect(transformTags('Status ((tag|A)) then ((tag|B|red)).')).toBe(
        `Status ${tag('label="A"')} then ${tag('label="B" bgcolor="red"')}.`,
      );
    });

    it('uses the configured component name', () => {
      expect(transformTags('((tag|Done))', { componentName: 'Badge' })).toBe('<Badge label="Done"></Badge>');
    });
  });

  describe('colors', () => {
    it('keeps palette colors, lowercased', () => {
      expect(transformTags('((tag|x|GREEN))')).toBe(tag('label="x" bgcolor="green"'));
    });

    it('keeps 3- and 6-digit hex backgrounds', () => {
      expect(transformTags('((tag|x|#abc))')).toBe(tag('label="x" bgcolor="#abc"'));
      expect(transformTags('((tag|x|#A1B2C3))')).toBe(tag('label="x" bgcolor="#A1B2C3"'));
    });

    it('drops an invalid background but keeps the tag', () => {
      expect(transformTags('((tag|x|chartreuse))')).toBe(tag('label="x"'));
      expect(transformTags('((tag|x|#12))')).toBe(tag('label="x"'));
      expect(transformTags('((tag|x|#ggg))')).toBe(tag('label="x"'));
    });

    it('drops a named foreground color, which only hex may use', () => {
      expect(transformTags('((tag|x|green|red))')).toBe(tag('label="x" bgcolor="green"'));
    });

    it('keeps a valid foreground even when the background is invalid', () => {
      expect(transformTags('((tag|x|nope|#000))')).toBe(tag('label="x" fgcolor="#000"'));
    });

    it('treats empty color slots as unset', () => {
      expect(transformTags('((tag|x||#000))')).toBe(tag('label="x" fgcolor="#000"'));
    });
  });

  describe('HTML escaping', () => {
    it.each([
      ['<b>', '&lt;b&gt;'],
      ['a&b', 'a&amp;b'],
      ['say "hi"', 'say &quot;hi&quot;'],
      ["it's", 'it&#39;s'],
    ])('escapes %s in the label', (label, escaped) => {
      expect(transformTags(`((tag|${label}))`)).toBe(tag(`label="${escaped}"`));
    });

    it('cannot break out of the attribute with a crafted label', () => {
      const output = transformTags('((tag|"><b onmouseover=x>))');
      expect(output).toBe(tag('label="&quot;&gt;&lt;b onmouseover=x&gt;"'));
    });

    it('does not emit raw angle brackets from a label containing markup', () => {
      expect(transformTags('((tag|<img src=x>))')).not.toContain('<img');
    });
  });

  describe('code preservation', () => {
    it('leaves fenced code blocks untouched', () => {
      const source = '```\n((tag|Done))\n```';
      expect(transformTags(source)).toBe(source);
    });

    it('leaves fenced blocks with a language untouched', () => {
      const source = '```md\n((tag|Done|green))\n```';
      expect(transformTags(source)).toBe(source);
    });

    it('leaves ~~~ fenced blocks untouched', () => {
      const source = '~~~\n((tag|Done))\n~~~';
      expect(transformTags(source)).toBe(source);
    });

    it('leaves indented fences untouched', () => {
      const source = '  ```\n  ((tag|Done))\n  ```';
      expect(transformTags(source)).toBe(source);
    });

    it('leaves inline code untouched', () => {
      const source = 'Write `((tag|Done))` to get a tag.';
      expect(transformTags(source)).toBe(source);
    });

    it('leaves double-backtick inline code untouched, even with a backtick inside', () => {
      const source = 'Use ``a ` ((tag|Done))`` here.';
      expect(transformTags(source)).toBe(source);
    });

    it('keeps a longer fence open across a shorter fence inside it', () => {
      const source = '````md\n```\n((tag|Done))\n```\n````';
      expect(transformTags(source)).toBe(source);
    });

    it('keeps a ``` fence open across a ~~~ line inside it', () => {
      const source = '```\n~~~\n((tag|Done))\n~~~\n```';
      expect(transformTags(source)).toBe(source);
    });

    it('treats an unclosed fence as running to the end of the document', () => {
      const source = '```\n((tag|Done))\nstill code';
      expect(transformTags(source)).toBe(source);
    });

    it('does not let a one-line ```code``` span swallow the rest of the document', () => {
      expect(transformTags('```code```\n\n((tag|Done))')).toBe(`\`\`\`code\`\`\`\n\n${tag('label="Done"')}`);
    });

    it('transforms tags before, between and after code', () => {
      const output = transformTags('((tag|A))\n\n```\n((tag|B))\n```\n\n((tag|C)) and `((tag|D))`');
      expect(output).toBe(`${tag('label="A"')}\n\n\`\`\`\n((tag|B))\n\`\`\`\n\n${tag('label="C"')} and \`((tag|D))\``);
    });

    it('handles CRLF line endings', () => {
      const source = '```\r\n((tag|Done))\r\n```\r\n((tag|After))';
      expect(transformTags(source)).toBe(`\`\`\`\r\n((tag|Done))\r\n\`\`\`\r\n${tag('label="After"')}`);
    });

    it('is not confused by source containing NUL characters', () => {
      expect(transformTags('\u00000\u0000 ((tag|Done)) `x`')).toBe(`\u00000\u0000 ${tag('label="Done"')} \`x\``);
    });
  });

  describe('edge cases', () => {
    it('returns an empty string unchanged', () => {
      expect(transformTags('')).toBe('');
    });

    it('returns text without tags unchanged', () => {
      const source = '# Heading\n\nJust (parentheses) and tag words.';
      expect(transformTags(source)).toBe(source);
    });

    it.each(['((tag))', '((tag|))', '((tag| ))', '((tag||green))', '(tag|Done)', '((tag|Done)', '((tags|Done))'])(
      'leaves %s as written',
      (source) => {
        expect(transformTags(source)).toBe(source);
      },
    );

    it('does not match across lines', () => {
      const source = '((tag|Do\nne))';
      expect(transformTags(source)).toBe(source);
    });

    it('keeps special characters that are not separators in the label', () => {
      expect(transformTags('((tag|v1.2 - ready!))')).toBe(tag('label="v1.2 - ready!"'));
    });

    it('keeps non-ASCII labels', () => {
      expect(transformTags('((tag|Fertig ✓))')).toBe(tag('label="Fertig ✓"'));
    });

    it('transforms a tag inside a heading, list item and table cell', () => {
      const output = transformTags('# Title ((tag|WIP))\n\n- item ((tag|Done))\n\n| a |\n| - |\n| ((tag|x)) |');
      expect(output.match(/<MarkdownTag/g)).toHaveLength(3);
    });

    it('handles a large document with many tags and code blocks quickly', () => {
      const section = 'Text ((tag|Done|green)) more `((tag|no))`\n\n```\n((tag|no))\n```\n\n';
      const source = section.repeat(2000);
      const start = performance.now();
      const output = transformTags(source);
      expect(performance.now() - start).toBeLessThan(2000);
      expect(output.match(/<MarkdownTag/g)).toHaveLength(2000);
      expect(output.match(/\(\(tag\|no\)\)/g)).toHaveLength(4000);
    });
  });
});
