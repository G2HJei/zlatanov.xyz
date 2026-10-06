import { expect, test } from '@playwright/test';

import { SITE } from '../../src/lib/site';

test('home page renders the slogan, the navigation and the three cards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Boyan Zlatanov/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(SITE.slogan);

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

test('intro card links to email, GitHub, LinkedIn and the feed', async ({ page }) => {
  await page.goto('/');
  const intro = page.locator('main section#about');
  await expect(intro.getByRole('link', { name: SITE.email })).toHaveAttribute(
    'href',
    `mailto:${SITE.email}`,
  );
  const elsewhere = intro.getByRole('list', { name: 'Elsewhere' });
  await expect(elsewhere.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    SITE.social.github,
  );
  await expect(elsewhere.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    SITE.social.linkedin,
  );
  await expect(elsewhere.getByRole('link', { name: 'RSS' })).toHaveAttribute('href', '/rss.xml');
});

/** Text in `main` that is hidden or faded by itself or an ancestor, described for the report. */
const hiddenCopy = () => {
  const main = document.querySelector('main');
  if (!main) return ['no main'];
  const hidden: string[] = [];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (!text) continue;
    for (let element = node.parentElement; element && element !== main;) {
      const style = getComputedStyle(element);
      if (
        Number(style.opacity) < 1 ||
        style.visibility !== 'visible' ||
        style.clipPath !== 'none'
      ) {
        hidden.push(`"${text.slice(0, 40)}" (${element.tagName} ${element.className})`);
        break;
      }
      element = element.parentElement;
    }
  }
  return hidden;
};

test('the page assembles around its copy, which stays fully visible at every scroll', async ({
  page,
}) => {
  await page.goto('/');

  // A minifier that folds `animation-timeline` into the `animation` shorthand silently drops
  // every scroll-driven animation; count them to catch that.
  const scrollDriven = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((animation) => animation.timeline?.constructor.name === 'ViewTimeline').length,
  );
  expect(scrollDriven).toBeGreaterThan(50);

  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let top = 0; top <= bottom + 200; top += 200) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await page.evaluate(hiddenCopy), `scrolled to ${top}`).toEqual([]);
  }

  // At the bottom of the page everything is built: nothing waits for a scroll that can't happen.
  const unfinished = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.timeline?.constructor.name === 'ViewTimeline')
      .filter((animation) => (animation.effect?.getComputedTiming().progress ?? 1) < 0.999)
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const target = effect.target as Element | null;
        return `${(animation as CSSAnimation).animationName} on ${target?.className} ${effect.pseudoElement ?? ''}`;
      }),
  );
  expect(unfinished).toEqual([]);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the home page shows finished, with nothing animating', async ({ page }) => {
    await page.goto('/');
    const running = await page.evaluate(() => {
      const main = document.querySelector('main');
      return document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return target && main?.contains(target);
      }).length;
    });
    expect(running).toBe(0);
  });
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
