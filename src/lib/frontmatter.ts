import { load as parseYaml } from 'js-yaml';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export interface SplitResult {
  data: unknown;
  body: string;
}

/**
 * Minimal frontmatter splitter used by the content-validation unit test.
 * Astro parses frontmatter itself at build time; this exists so the same zod
 * schema can be run against raw files from Vitest without booting Astro.
 * Uses js-yaml, the same YAML dialect Astro uses, so both agree on how a
 * value such as `2026-09-02` is typed. Tolerates a UTF-8 BOM and CRLF.
 */
export function splitFrontmatter(raw: string): SplitResult {
  const text = raw.startsWith('﻿') ? raw.slice(1) : raw;
  const match = FRONTMATTER.exec(text);
  if (match === null) return { data: {}, body: text };
  const yaml = match[1] ?? '';
  return { data: parseYaml(yaml) ?? {}, body: text.slice(match[0].length) };
}
