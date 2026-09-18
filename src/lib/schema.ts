import { z } from 'astro/zod';

import { SITE } from './site';

/**
 * Frontmatter contract for `content/posts/*.md`.
 * Used by the Astro content collection at build time and by the unit test
 * that validates every post file, so an invalid post fails fast in both places.
 */
export const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(false),
  author: z.string().min(1).default(SITE.author),
  /** Path under `public/` (e.g. `/images/cover.png`) or an absolute URL; used as og:image. */
  cover: z.string().min(1).optional(),
});

export type PostFrontmatter = z.infer<typeof postSchema>;

/** Frontmatter contract for `content/case-studies/*.md`. */
export const caseStudySchema = z.object({
  title: z.string().min(1),
  client: z.string().min(1).optional(),
  period: z.string().min(1),
  stack: z.array(z.string().min(1)).default([]),
  summary: z.string().min(1),
  outcome: z.string().min(1),
  order: z.number().int().default(0),
  draft: z.boolean().default(false),
});

export type CaseStudyFrontmatter = z.infer<typeof caseStudySchema>;
