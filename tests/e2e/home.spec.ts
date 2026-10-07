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
    // Copy for assistive tech only (the typed subtitle's full text) is hidden by design.
    if (!text || node.parentElement?.closest('.sr-only')) continue;
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

  // The hero's run plays once on load and types the subtitle out; from then on, nothing hides.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ).then(() => true),
  );

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

/**
 * Smooth-scrolls down, turns back halfway without stopping, then comes down again short of the
 * turn, checking on every frame that no scroll-driven animation has fallen back from the
 * furthest it got. Resolves with the ones that did.
 */
const rewoundOnTheWayBack = () =>
  new Promise<string[]>((resolve) => {
    const animations = document
      .getAnimations()
      .filter((animation) => animation.timeline !== document.timeline);
    const furthest = animations.map(() => 0);
    const rewound = new Set<string>();
    let still = 0;
    let lastY = -1;
    const legs = [
      { top: 2400, ready: () => true },
      { top: 600, ready: () => scrollY > 1400 },
      { top: 1200, ready: () => still > 10 },
    ];
    let leg = 0;

    const frame = () => {
      animations.forEach((animation, index) => {
        const effect = animation.effect as KeyframeEffect;
        const progress = effect.getComputedTiming().progress ?? 0;
        if (progress < (furthest[index] ?? 0) - 1e-4) {
          const target = effect.target as Element | null;
          rewound.add(
            `${(animation as CSSAnimation).animationName} on ${target?.getAttribute('class')} ${effect.pseudoElement ?? ''}`,
          );
        }
        furthest[index] = Math.max(furthest[index] ?? 0, progress);
      });
      still = scrollY === lastY ? still + 1 : 0;
      lastY = scrollY;

      const next = legs[leg];
      if (next?.ready()) {
        window.scrollTo({ top: next.top, behavior: 'smooth' });
        leg += 1;
        still = 0;
      } else if (!next && still > 10) {
        resolve([...rewound]);
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

test('nothing rewinds when the reader scrolls back up', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(rewoundOnTheWayBack)).toEqual([]);
});

test('at the end of the page the wire goes and everything stays built', async ({ page }) => {
  await page.goto('/');
  const scrollTo = async (top: number) => {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.evaluate(() => new Promise(requestAnimationFrame));
  };

  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollTo(bottom);
  await expect(page.locator('.home')).toHaveClass(/\bdone\b/);
  for (const wire of await page.locator('.home :is(.track, .rig-node)').all()) {
    await expect(wire).toHaveCSS('opacity', '0');
  }
  // In the hero the nodes and the wire between them are pseudo-elements.
  const heroWire = () =>
    page.evaluate(() =>
      [
        ...[...document.querySelectorAll('.hero-stage')].flatMap((stage) => [
          getComputedStyle(stage, '::before').opacity,
          getComputedStyle(stage, '::after').opacity,
        ]),
        ...[...document.querySelectorAll('.hero-prompt')].map(
          (prompt) => getComputedStyle(prompt, '::after').opacity,
        ),
      ].filter((opacity) => opacity !== '0'),
    );
  await expect.poll(heroWire).toEqual([]);

  // Back at the top the page is as it was at the bottom: finished, and no longer animating.
  await scrollTo(0);
  const unfinished = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.timeline !== document.timeline)
      .filter(
        (animation) =>
          animation.playState !== 'paused' ||
          (animation.effect?.getComputedTiming().progress ?? 1) < 0.999,
      )
      .map((animation) => (animation as CSSAnimation).animationName),
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
