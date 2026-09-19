import { expect, test } from '@playwright/test';

// Post cards on the blog page live under the "posts" heading, so a published case
// study in the "work" card above them never gets mistaken for a post.
const firstPostLink = 'main #posts article h3 a';

test('blog index lists posts and links through to a post page', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');

  const cards = page.locator('main #posts article');
  await expect(cards).not.toHaveCount(0);

  const link = page.locator(firstPostLink).first();
  const title = (await link.textContent())?.trim();
  await link.click();

  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title ?? '');
});

test('a post shows author, date, reading time and tags', async ({ page }) => {
  await page.goto('/blog/');
  await page.locator(firstPostLink).first().click();

  const article = page.locator('main article');
  await expect(article.getByText('Boyan Zlatanov').first()).toBeVisible();
  await expect(article.locator('time[datetime]').first()).toHaveAttribute(
    'datetime',
    /^\d{4}-\d{2}-\d{2}$/,
  );
  await expect(article.getByText(/\d+ min read/)).toBeVisible();

  const tags = article.getByRole('list', { name: 'Tags' }).getByRole('link');
  await expect(tags).not.toHaveCount(0);

  const tagLabel = (await tags.first().textContent())?.trim() ?? '';
  await tags.first().click();
  await expect(page).toHaveURL(/\/blog\/tags\/[a-z0-9-]+\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(tagLabel);
});

test('post pages expose article metadata for social previews', async ({ page }) => {
  await page.goto('/blog/');
  await page.locator(firstPostLink).first().click();

  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /^https?:\/\//,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https:\/\/zlatanov\.xyz\/blog\/.+\/$/,
  );
});

test('fenced code blocks are syntax highlighted', async ({ page, request }) => {
  const feed = await (await request.get('/rss.xml')).text();
  const links = [...feed.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)]
    .map((match) => new URL(match[1] ?? '').pathname)
    .filter((path) => path.startsWith('/blog/'));

  let highlighted = 0;
  for (const path of links) {
    await page.goto(path);
    highlighted += await page.locator('pre.astro-code').count();
    if (highlighted > 0) break;
  }

  test.skip(highlighted === 0, 'no published post contains a fenced code block yet');
  await expect(page.locator('pre.astro-code').first()).toHaveAttribute('style', /background-color/);
});
