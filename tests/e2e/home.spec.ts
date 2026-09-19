import { expect, test } from '@playwright/test';

import { SITE } from '../../src/lib/site';

test('home page renders the profile, the navigation and the three cards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Boyan Zlatanov/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(SITE.name);

  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const label of ['home', 'blog']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: 'home', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  for (const id of ['about', 'services', 'contact']) {
    const card = page.locator(`main section#${id}`);
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 2 })).toHaveCount(1);
  }
  await expect(page.locator('main section#services article')).not.toHaveCount(0);

  expect(errors).toEqual([]);
});

test('profile pills link to GitHub, LinkedIn, email and the feed', async ({ page }) => {
  await page.goto('/');
  const elsewhere = page.getByRole('list', { name: 'Elsewhere' });
  await expect(elsewhere.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    SITE.social.github,
  );
  await expect(elsewhere.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    SITE.social.linkedin,
  );
  await expect(elsewhere.getByRole('link', { name: 'Email' })).toHaveAttribute(
    'href',
    `mailto:${SITE.email}`,
  );
  await expect(elsewhere.getByRole('link', { name: 'RSS' })).toHaveAttribute('href', '/rss.xml');
});

test('contact card offers email and LinkedIn', async ({ page }) => {
  await page.goto('/');
  const contact = page.locator('main section#contact');
  await expect(contact.getByRole('link', { name: SITE.email })).toHaveAttribute(
    'href',
    `mailto:${SITE.email}`,
  );
  await expect(contact.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    SITE.social.linkedin,
  );
});
