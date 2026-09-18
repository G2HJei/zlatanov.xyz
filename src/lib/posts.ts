/** Anything with a `draft` flag: posts, case studies. */
export interface Publishable {
  data: { draft: boolean };
}

/**
 * Structural view of a post entry. `CollectionEntry<'posts'>` satisfies it,
 * and tests can build lightweight fixtures without Astro.
 */
export interface PostLike extends Publishable {
  id: string;
  data: {
    title: string;
    date: Date;
    draft: boolean;
    tags: string[];
  };
}

export interface PublishOptions {
  /** Include drafts (used in `astro dev` so authors can preview them). */
  includeDrafts?: boolean;
}

export function isPublished(
  entry: Publishable,
  { includeDrafts = false }: PublishOptions = {},
): boolean {
  return includeDrafts || !entry.data.draft;
}

/** Newest first; ties broken by id so ordering is deterministic. */
export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export function postUrl(id: string): string {
  return `/blog/${id}/`;
}

export function caseStudyUrl(id: string): string {
  return `/case-studies/${id}/`;
}
