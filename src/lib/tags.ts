import type { PostLike } from './posts';

/**
 * URL-safe slug for a tag label: `ci/cd` → `ci-cd`, `Domain Driven Design` → `domain-driven-design`.
 * Lower-cases, strips diacritics, collapses any non-alphanumeric run into a single dash.
 */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function tagUrl(slug: string): string {
  return `/blog/tags/${slug}/`;
}

export interface TagGroup<T extends PostLike> {
  slug: string;
  /** Display label, taken from the first (newest) post that uses the tag. */
  label: string;
  count: number;
  posts: T[];
}

/**
 * Groups posts by tag slug. Expects `posts` already sorted newest-first so that
 * the label and the per-tag post order follow the same convention.
 * Sorted by count (desc), then slug (asc).
 */
export function groupByTag<T extends PostLike>(posts: T[]): TagGroup<T>[] {
  const groups = new Map<string, TagGroup<T>>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      if (slug === '') continue;
      let group = groups.get(slug);
      if (group === undefined) {
        group = { slug, label: tag, count: 0, posts: [] };
        groups.set(slug, group);
      }
      if (!group.posts.includes(post)) {
        group.posts.push(post);
        group.count += 1;
      }
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

export interface TagCollision {
  slug: string;
  labels: string[];
}

/**
 * Finds tags whose labels differ (beyond letter case) yet map to the same slug,
 * e.g. `ci/cd` and `ci-cd`. Such inconsistencies should be fixed in the posts.
 */
export function findTagCollisions(posts: PostLike[]): TagCollision[] {
  const labelsBySlug = new Map<string, Set<string>>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const labels = labelsBySlug.get(slug) ?? new Set<string>();
      labels.add(tag.toLowerCase());
      labelsBySlug.set(slug, labels);
    }
  }
  return [...labelsBySlug]
    .filter(([, labels]) => labels.size > 1)
    .map(([slug, labels]) => ({ slug, labels: [...labels].sort() }));
}
