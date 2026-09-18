import { expect, test } from '@playwright/test';

test('tag index lists tags with counts and each tag page lists posts', async ({ page }) => {
  await page.goto('/blog/tags/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tags');

  const tagLinks = page.locator('main ul a');
  await expect(tagLinks).not.toHaveCount(0);

  const href = await tagLinks.first().getAttribute('href');
  expect(href).toMatch(/^\/blog\/tags\/[a-z0-9-]+\/$/);

  await tagLinks.first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('main article')).not.toHaveCount(0);
  await expect(page.getByRole('link', { name: 'All tags' })).toBeVisible();
});
