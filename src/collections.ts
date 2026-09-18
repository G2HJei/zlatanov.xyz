import { getCollection, type CollectionEntry } from 'astro:content';

import { isPublished, sortByDateDesc } from './lib/posts';

export type Post = CollectionEntry<'posts'>;

/**
 * The single source of truth for "which posts exist": drafts are visible in
 * `astro dev` only. Every list, route, tag page and feed must go through here
 * so a draft can never leak into the production build.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', (entry) =>
    isPublished(entry, { includeDrafts: import.meta.env.DEV }),
  );
  return sortByDateDesc(posts);
}
