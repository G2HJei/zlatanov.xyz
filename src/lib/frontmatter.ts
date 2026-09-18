import { parse as parseYaml } from 'yaml';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export interface SplitResult {
  data: unknown;
  body: string;
}

/**
 * Minimal frontmatter splitter used by the content-validation unit test.
 * Astro parses frontmatter itself at build time; this exists so the same zod
 * schema can be run against raw files from Vitest without booting Astro.
 * Tolerates a UTF-8 BOM and CRLF line endings.
 */
export function splitFrontmatter(raw: string): SplitResult {
  const text = raw.startsWith('﻿') ? raw.slice(1) : raw;
  const match = FRONTMATTER.exec(text);
  if (match === null) return { data: {}, body: text };
  const yaml = match[1] ?? '';
  return { data: parseYaml(yaml) ?? {}, body: text.slice(match[0].length) };
}
