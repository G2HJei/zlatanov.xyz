import { expect, test } from '@playwright/test';

const pages = [
  { path: '/services/', heading: 'Services' },
  { path: '/about/', heading: 'About' },
  { path: '/contact/', heading: 'Contact' },
  { path: '/case-studies/', heading: 'Work' },
];

for (const { path, heading } of pages) {
  test(`${path} renders with a single h1`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: heading }),
    ).toHaveAttribute('aria-current', 'page');
  });
}

test('service anchors from the home page resolve', async ({ page }) => {
  await page.goto('/');
  const firstService = page.locator('main article h3 a').first();
  const href = await firstService.getAttribute('href');
  expect(href).toMatch(/^\/services\/#[a-z0-9-]+$/);

  await firstService.click();
  await expect(page).toHaveURL(new RegExp(`${href?.replace('#', '\\#')}$`));
  const id = href?.split('#')[1] ?? '';
  await expect(page.locator(`section#${id}`)).toBeVisible();
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
