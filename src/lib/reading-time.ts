export interface ReadingTime {
  words: number;
  minutes: number;
  /** Human-readable label, e.g. `3 min read`. */
  text: string;
}

const WORD = /[\p{L}\p{N}]/u;

/** Counts whitespace-separated tokens that contain at least one letter or digit. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => WORD.test(token)).length;
}

/** Removes markdown syntax that would otherwise inflate the word count. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ' ') // frontmatter, if present
    .replace(/<[^>]+>/g, ' ') // inline html
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/^\s*(```|~~~).*$/gm, ' ') // fence markers
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ') // horizontal rules
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ') // table separator rows
    .replace(/[`*_>#|]/g, ' '); // remaining inline markup
}

export function readingTime(markdown: string, wordsPerMinute = 200): ReadingTime {
  const words = countWords(stripMarkdown(markdown));
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return { words, minutes, text: `${minutes} min read` };
}
