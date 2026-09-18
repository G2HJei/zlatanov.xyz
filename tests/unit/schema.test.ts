import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { splitFrontmatter } from '../../src/lib/frontmatter';
import { caseStudySchema, postSchema } from '../../src/lib/schema';
import { findTagCollisions } from '../../src/lib/tags';

const postsDir = path.resolve(process.cwd(), 'content/posts');
const caseStudiesDir = path.resolve(process.cwd(), 'content/case-studies');
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

interface RawEntry {
  file: string;
  data: unknown;
}

/** Mirrors the content collection: top-level `.md` files, underscore-prefixed ones excluded. */
async function loadEntries(dir: string): Promise<RawEntry[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  return Promise.all(
    files.map(async (file) => ({
      file,
      data: splitFrontmatter(await readFile(path.join(dir, file), 'utf8')).data,
    })),
  );
}

function describeIssues(result: { success: boolean; error?: { issues: unknown[] } }): string {
  if (result.success || result.error === undefined) return '';
  return (result.error.issues as { path: PropertyKey[]; message: string }[])
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

describe('content/posts', () => {
  it('has at least one published (non-draft) post', async () => {
    const published = (await loadEntries(postsDir))
      .map((entry) => postSchema.parse(entry.data))
      .filter((post) => !post.draft);
    expect(published.length).toBeGreaterThan(0);
  });

  it('every post has frontmatter that satisfies the schema', async () => {
    for (const entry of await loadEntries(postsDir)) {
      const result = postSchema.safeParse(entry.data);
      expect(result.success, `${entry.file} → ${describeIssues(result)}`).toBe(true);
    }
  });

  it('file names are kebab-case slugs', async () => {
    for (const entry of await loadEntries(postsDir)) {
      expect(entry.file, `${entry.file} is not kebab-case`).toMatch(KEBAB_CASE);
    }
  });

  it('does not spell the same tag two different ways', async () => {
    const posts = (await loadEntries(postsDir)).map((entry) => ({
      id: entry.file,
      data: postSchema.parse(entry.data),
    }));
    expect(findTagCollisions(posts)).toEqual([]);
  });
});

describe('content/case-studies', () => {
  it('every case study has frontmatter that satisfies the schema', async () => {
    for (const entry of await loadEntries(caseStudiesDir)) {
      const result = caseStudySchema.safeParse(entry.data);
      expect(result.success, `${entry.file} → ${describeIssues(result)}`).toBe(true);
    }
  });

  it('file names are kebab-case slugs', async () => {
    for (const entry of await loadEntries(caseStudiesDir)) {
      expect(entry.file, `${entry.file} is not kebab-case`).toMatch(KEBAB_CASE);
    }
  });
});

describe('postSchema', () => {
  const minimal = { title: 'T', description: 'D', date: '2026-09-02' };

  it('applies defaults for optional fields', () => {
    const parsed = postSchema.parse(minimal);
    expect(parsed.tags).toEqual([]);
    expect(parsed.draft).toBe(false);
    expect(parsed.author).toBe('Boyan Zlatanov');
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it('accepts YAML dates already parsed to Date objects', () => {
    const parsed = postSchema.parse({ ...minimal, date: new Date('2026-09-02') });
    expect(parsed.date.toISOString()).toBe('2026-09-02T00:00:00.000Z');
  });

  it('rejects a post without a title or description', () => {
    expect(postSchema.safeParse({ description: 'D', date: '2026-09-02' }).success).toBe(false);
    expect(postSchema.safeParse({ title: 'T', date: '2026-09-02' }).success).toBe(false);
  });

  it('rejects empty tags and tags that cannot form a URL', () => {
    expect(postSchema.safeParse({ ...minimal, tags: ['java', ''] }).success).toBe(false);
    expect(postSchema.safeParse({ ...minimal, tags: ['!!!'] }).success).toBe(false);
    expect(postSchema.safeParse({ ...minimal, tags: ['ci/cd'] }).success).toBe(true);
  });
});

describe('caseStudySchema', () => {
  const minimal = { title: 'T', period: 2025, summary: 'S', outcome: 'O' };

  it('stores a bare-year period as a string', () => {
    expect(caseStudySchema.parse(minimal).period).toBe('2025');
    expect(caseStudySchema.parse({ ...minimal, period: '2024–2025' }).period).toBe('2024–2025');
  });

  it('rejects a missing period', () => {
    const { period: _omitted, ...withoutPeriod } = minimal;
    expect(caseStudySchema.safeParse(withoutPeriod).success).toBe(false);
    expect(caseStudySchema.safeParse({ ...minimal, period: null }).success).toBe(false);
  });
});
