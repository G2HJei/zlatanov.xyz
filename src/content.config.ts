import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

import { postSchema } from './lib/schema';

// Files starting with `_` (e.g. `_template.md`) are never loaded.
const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './content/posts' }),
  schema: postSchema,
});

export const collections = { posts };
