import { expect, test } from '@playwright/test';

test('home page renders the hero, navigation and latest posts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Boyan Zlatanov');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Java');

  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const label of ['Services', 'Work', 'Blog', 'About', 'Contact']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }

  const latest = page.getByRole('region', { name: 'Latest writing' });
  await expect(latest.locator('article')).not.toHaveCount(0);
  await expect(latest.locator('article h2 a').first()).toHaveAttribute('href', /^\/blog\/.+\/$/);

  expect(errors).toEqual([]);
});

test('primary call to action leads to the contact page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Book a conversation' }).click();
  await expect(page).toHaveURL(/\/contact\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact');
});
