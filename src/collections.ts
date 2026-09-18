import { getCollection, type CollectionEntry } from 'astro:content';

import { isPublished, sortByDateDesc } from './lib/posts';

export type Post = CollectionEntry<'posts'>;
export type CaseStudy = CollectionEntry<'caseStudies'>;

/** Drafts are visible in `astro dev` only. */
const includeDrafts = import.meta.env.DEV;

/**
 * The single source of truth for "which posts exist". Every list, route, tag
 * page and feed must go through here so a draft can never leak into production.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', (entry) => isPublished(entry, { includeDrafts }));
  return sortByDateDesc(posts);
}

/** Case studies ordered by their `order` field, then title. */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  const entries = await getCollection('caseStudies', (entry) =>
    isPublished(entry, { includeDrafts }),
  );
  return [...entries].sort(
    (a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
}
