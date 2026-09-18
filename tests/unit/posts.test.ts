import { describe, expect, it } from 'vitest';

import {
  caseStudyUrl,
  isPublished,
  type PostLike,
  postUrl,
  sortByDateDesc,
} from '../../src/lib/posts';

const post = (id: string, date: string, draft = false): PostLike => ({
  id,
  data: { title: id, date: new Date(date), draft, tags: [] },
});

describe('isPublished', () => {
  it('publishes non-drafts', () => {
    expect(isPublished(post('a', '2026-01-01'))).toBe(true);
  });

  it('hides drafts by default', () => {
    expect(isPublished(post('a', '2026-01-01', true))).toBe(false);
  });

  it('shows drafts when asked to (dev mode)', () => {
    expect(isPublished(post('a', '2026-01-01', true), { includeDrafts: true })).toBe(true);
  });
});

describe('sortByDateDesc', () => {
  it('orders newest first and breaks ties by id', () => {
    const posts = [post('b', '2026-01-01'), post('c', '2026-03-01'), post('a', '2026-01-01')];
    expect(sortByDateDesc(posts).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate its input', () => {
    const posts = [post('old', '2026-01-01'), post('new', '2026-02-01')];
    sortByDateDesc(posts);
    expect(posts.map((p) => p.id)).toEqual(['old', 'new']);
  });
});

describe('urls', () => {
  it('build trailing-slash URLs', () => {
    expect(postUrl('hello-world')).toBe('/blog/hello-world/');
    expect(caseStudyUrl('legacy-orders')).toBe('/case-studies/legacy-orders/');
  });
});
