import { getCollection, type CollectionEntry } from 'astro:content';

import { isPublished, sortByDateDesc } from './lib/posts';

export type Post = CollectionEntry<'posts'>;

/** Drafts are visible in `astro dev` only. */
const includeDrafts = import.meta.env.DEV;

/**
 * The single source of truth for "which posts exist". Every list, route, tag
 * filter and feed must go through here so a draft can never leak into production.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', (entry) => isPublished(entry, { includeDrafts }));
  return sortByDateDesc(posts);
}
