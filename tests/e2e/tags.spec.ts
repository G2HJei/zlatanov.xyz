import { expect, type Locator, test } from '@playwright/test';

const background = (link: Locator) =>
  link.evaluate((element) => getComputedStyle(element).backgroundColor);

test('each tag filter shows exactly the posts carrying that tag', async ({ page }) => {
  await page.goto('/blog/');
  const filters = page.locator('main').getByRole('list', { name: 'filter by tag' });
  const all = filters.locator('#all');
  const posts = page.locator('main #posts li[data-tags]');
  const total = await posts.count();

  // No fragment: every post shows and `all` is the solid pill.
  await expect(posts.filter({ visible: true })).toHaveCount(total);
  const active = await background(all);

  const tags = filters.locator('a[id^="tag-"]');
  await expect(tags).not.toHaveCount(0);
  for (const tag of await tags.all()) {
    const id = (await tag.getAttribute('id')) ?? '';
    const slug = id.replace(/^tag-/, '');
    const tagged = await page.locator(`main #posts li[data-tags~="${slug}"]`).count();

    await tag.click();
    await expect(page).toHaveURL(new RegExp(`/blog/#${id}$`));
    await expect(posts.filter({ visible: true })).toHaveCount(tagged);
    await expect(tag).toContainText(String(tagged));
    // The pills fade between states, so wait for the colours to settle.
    await expect.poll(() => background(tag)).toBe(active);
    await expect.poll(() => background(all)).not.toBe(active);
  }

  await all.click();
  await expect(posts.filter({ visible: true })).toHaveCount(total);

  // Back to the last tag: the fragment, and with it the filter, comes back.
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/#tag-[a-z0-9-]+$/);
  const slug = new URL(page.url()).hash.replace(/^#tag-/, '');
  await expect(posts.filter({ visible: true })).toHaveCount(
    await page.locator(`main #posts li[data-tags~="${slug}"]`).count(),
  );
});
