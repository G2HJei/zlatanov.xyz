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

test('the icons in the head and in the web manifest all resolve', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(hrefs).not.toHaveLength(0);

  const manifest = await request.get('/site.webmanifest');
  expect(manifest.headers()['content-type']).toBe('application/manifest+json');
  const { icons } = (await manifest.json()) as { icons: { src: string }[] };
  expect(icons).not.toHaveLength(0);

  for (const href of [...hrefs, ...icons.map((icon) => icon.src)]) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
});

test('unknown URLs return the 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute(
    'href',
    '/',
  );
});
