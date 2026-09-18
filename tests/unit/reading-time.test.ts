import { describe, expect, it } from 'vitest';

import { countWords, readingTime, stripMarkdown } from '../../src/lib/reading-time';

const words = (count: number) => Array.from({ length: count }, (_, i) => `w${i}`).join(' ');

describe('countWords', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWords('one two  three\nfour\tfive')).toBe(5);
  });

  it('ignores tokens without letters or digits', () => {
    expect(countWords('--- *** | -> ==')).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('stripMarkdown', () => {
  it('keeps link text but drops the URL', () => {
    expect(countWords(stripMarkdown('[read the docs](https://example.com/a/very/long/path)'))).toBe(
      3,
    );
  });

  it('drops images, html tags and fence markers', () => {
    const md = '![alt text](img.png)\n<br>\n```java\nint x = 1;\n```\n';
    expect(countWords(stripMarkdown(md))).toBe(3);
  });

  it('drops frontmatter when present', () => {
    expect(countWords(stripMarkdown('---\ntitle: Hello World\n---\n\nbody'))).toBe(1);
  });
});

describe('readingTime', () => {
  it('reports at least one minute for empty content', () => {
    expect(readingTime('')).toEqual({ words: 0, minutes: 1, text: '1 min read' });
  });

  it('rounds up at the words-per-minute boundary', () => {
    expect(readingTime(words(200)).minutes).toBe(1);
    expect(readingTime(words(201)).minutes).toBe(2);
  });

  it('honours a custom reading speed', () => {
    expect(readingTime(words(100), 50)).toMatchObject({ words: 100, minutes: 2 });
  });
});

describe('stripMarkdown on code-heavy content', () => {
  it('does not swallow text between < and > on different lines', () => {
    const md = 'if (a < b) {\n  return;\n}\n\nsome words in between\n\nif (c > d) {\n}';
    expect(countWords(stripMarkdown(md))).toBe(11);
  });

  it('keeps snake_case identifiers as single words', () => {
    expect(countWords(stripMarkdown('snake_case MAX_VALUE'))).toBe(2);
  });
});
