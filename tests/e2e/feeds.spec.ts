import { expect, test } from '@playwright/test';

test('rss.xml is a valid-looking feed with items', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/xml/);

  const body = await response.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<item>');
  expect(body).toContain('<link>https://zlatanov.xyz/blog/');
});

test('sitemap and robots.txt are published', async ({ request }) => {
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<sitemapindex');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://zlatanov.xyz/sitemap-index.xml');
});
