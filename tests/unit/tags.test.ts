import { describe, expect, it } from 'vitest';

import type { PostLike } from '../../src/lib/posts';
import { findTagCollisions, groupByTag, tagSlug, tagUrl } from '../../src/lib/tags';

const post = (id: string, tags: string[], date = '2026-01-01'): PostLike => ({
  id,
  data: { title: id, date: new Date(date), draft: false, tags },
});

describe('tagSlug', () => {
  it.each([
    ['ci/cd', 'ci-cd'],
    ['CI/CD', 'ci-cd'],
    ['Domain Driven Design', 'domain-driven-design'],
    ['  spaced  ', 'spaced'],
    ['Ünïcödé', 'unicode'],
    ['a--b__c', 'a-b-c'],
    ['--edge--', 'edge'],
    ['C#', 'c'],
  ])('%j → %j', (input, expected) => {
    expect(tagSlug(input)).toBe(expected);
  });
});

describe('tagUrl', () => {
  it('builds a trailing-slash URL under /blog/tags/', () => {
    expect(tagUrl('ci-cd')).toBe('/blog/tags/ci-cd/');
  });
});

describe('groupByTag', () => {
  it('counts posts per tag and sorts by count, then slug', () => {
    const groups = groupByTag([
      post('a', ['java', 'tdd']),
      post('b', ['java']),
      post('c', ['ci/cd']),
    ]);
    expect(groups.map((g) => [g.slug, g.count])).toEqual([
      ['java', 2],
      ['ci-cd', 1],
      ['tdd', 1],
    ]);
  });

  it('keeps posts in the order given (newest first) inside each group', () => {
    const groups = groupByTag([post('new', ['java'], '2026-02-01'), post('old', ['java'])]);
    expect(groups[0]?.posts.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('merges spellings that differ only in case and labels the group after the first post', () => {
    const groups = groupByTag([post('new', ['Java'], '2026-02-01'), post('old', ['java'])]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Java');
    expect(groups[0]?.count).toBe(2);
  });

  it('does not count a post twice when it repeats a tag', () => {
    const groups = groupByTag([post('a', ['java', 'Java'])]);
    expect(groups[0]?.count).toBe(1);
  });

  it('ignores tags that slugify to nothing', () => {
    expect(groupByTag([post('a', ['!!!'])])).toEqual([]);
  });

  it('returns an empty list for no posts', () => {
    expect(groupByTag([])).toEqual([]);
  });
});

describe('findTagCollisions', () => {
  it('flags different spellings that share a slug', () => {
    expect(findTagCollisions([post('a', ['ci/cd']), post('b', ['ci-cd'])])).toEqual([
      { slug: 'ci-cd', labels: ['ci-cd', 'ci/cd'] },
    ]);
  });

  it('ignores differences in letter case only', () => {
    expect(findTagCollisions([post('a', ['Java']), post('b', ['java'])])).toEqual([]);
  });
});
