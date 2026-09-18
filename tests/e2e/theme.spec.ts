import { expect, test } from '@playwright/test';

const isDark = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test('follows the system preference when nothing is stored', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await isDark(page)).toBe(true);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  expect(await isDark(page)).toBe(false);
});

test('toggle switches the theme and the choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  expect(await isDark(page)).toBe(false);

  const toggle = page.getByRole('button', { name: 'Dark mode' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();

  expect(await isDark(page)).toBe(true);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  await page.reload();
  expect(await isDark(page)).toBe(true);
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Dark mode' }).click();
  expect(await isDark(page)).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
});

test('stored preference wins over the system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.reload();
  expect(await isDark(page)).toBe(false);
});
