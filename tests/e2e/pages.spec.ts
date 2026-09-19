import { expect, test } from '@playwright/test';

test('blog page has the subscribe, work and posts sections', async ({ page }) => {
  const response = await page.goto('/blog/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');

  for (const id of ['subscribe', 'work', 'posts']) {
    await expect(page.locator(`main #${id}`)).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'RSS feed' })).toHaveAttribute('href', '/rss.xml');
  await expect(page.getByRole('link', { name: 'Browse tags' })).toHaveAttribute(
    'href',
    '/blog/tags/',
  );
});

const pages = [
  { path: '/', current: 'home' },
  { path: '/blog/', current: 'blog' },
  { path: '/blog/tags/', current: 'blog' },
] as const;

for (const { path, current } of pages) {
  test(`${path} has a single h1 and marks "${current}" as the current page`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: current, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
  });
}

test('unknown URLs return the 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute(
    'href',
    '/',
  );
});
