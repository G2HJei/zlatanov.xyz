import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { getPublishedPosts } from '../collections';
import { postUrl } from '../lib/posts';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post.id),
      categories: post.data.tags,
    })),
    customData: `<language>${SITE.locale}</language>`,
  });
}
