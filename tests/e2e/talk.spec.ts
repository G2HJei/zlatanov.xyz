import { expect, type Page, test } from '@playwright/test';

const path = '/talks/tdd/';

test('the talk shows every slide and stays out of search', async ({ page }) => {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('section.slide')).toHaveCount(28);
  await expect(page.getByRole('region', { name: /^Slide 2 of 28: Agenda$/ })).toBeAttached();
});

/** Number of the slide sitting right under the header (the screen's top in full screen). */
const currentSlide = (page: Page) =>
  page.evaluate(() => {
    const edge = document.querySelector('body > header')?.getBoundingClientRect().bottom ?? 0;
    const slides = [...document.querySelectorAll('section.slide')];
    return slides.findIndex((slide) => Math.abs(slide.getBoundingClientRect().top - edge) < 2) + 1;
  });

/** Top and height of a slide. */
const slideBox = (page: Page, number: number) =>
  page.locator(`#slide-${number}`).evaluate((element) => {
    const { top, height } = element.getBoundingClientRect();
    return [Math.round(top), Math.round(height)];
  });

test('a slide fills the screen below the header', async ({ page }) => {
  await page.goto(path);
  const header = page.locator('body > header');
  await expect(header).toBeVisible();
  const headerBottom = await header.evaluate((element) => element.getBoundingClientRect().bottom);
  const height = page.viewportSize()?.height ?? 0;

  // --header-height in the page mirrors Header.astro; this catches the two drifting apart.
  expect(await slideBox(page, 1)).toEqual([
    Math.round(headerBottom),
    height - Math.round(headerBottom),
  ]);

  await page.keyboard.press('PageDown');
  await expect.poll(() => currentSlide(page)).toBe(2);
  await expect(header).toBeInViewport();
});

test('in full screen the header goes and a slide takes the whole screen', async ({ page }) => {
  await page.goto(path);
  await page.keyboard.press('PageDown');
  await expect.poll(() => currentSlide(page)).toBe(2);

  // F11: the browser window goes full screen, which is what `display-mode: fullscreen` reports.
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  const fullScreen = (on: boolean) =>
    cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: on ? 'fullscreen' : 'normal' },
    });

  await fullScreen(true);
  const header = page.locator('body > header');
  await expect(header).toBeHidden();
  await expect.poll(() => slideBox(page, 2)).toEqual([0, page.viewportSize()?.height]);
  await page.keyboard.press('PageDown');
  await expect.poll(() => currentSlide(page)).toBe(3);

  await fullScreen(false);
  await expect(header).toBeVisible();
  await expect.poll(() => currentSlide(page)).toBe(3);
});

test('every presenting key moves exactly one slide', async ({ page }) => {
  await page.goto(path);
  const steps: [string, number][] = [
    ['PageDown', 2],
    ['ArrowDown', 3],
    ['Space', 4],
    ['ArrowRight', 5],
    ['PageUp', 4],
    ['ArrowUp', 3],
    ['Shift+Space', 2],
    ['ArrowLeft', 1],
    ['End', 28],
    ['Home', 1],
  ];
  for (const [key, slide] of steps) {
    await page.keyboard.press(key);
    await expect.poll(() => currentSlide(page), { message: key }).toBe(slide);
  }
});

test('a smooth-scrolling extension cannot run the slides away', async ({ page }) => {
  // What SmoothScroll does: on the window, unless the page handled the key, it replays the
  // key as many small instant scroll steps. With snapping, each step used to be a slide.
  await page.addInitScript(() => {
    addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.key !== 'PageDown') return;
      event.preventDefault();
      let left = innerHeight * 0.8;
      const step = () => {
        scrollBy({ top: 30, behavior: 'instant' });
        left -= 30;
        if (left > 0) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
  await page.goto(path);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1000);
  expect(await currentSlide(page)).toBe(2);
});

test('every slide keeps its text and pictures on the stage', async ({ page }) => {
  await page.goto(path);
  const outside = await page.evaluate(() =>
    [...document.querySelectorAll('.slide-stage')].flatMap((stage, index) => {
      const bounds = stage.getBoundingClientRect();
      // Runs and pictures: a paragraph's box can be wider than the slide, its text not.
      return [...stage.querySelectorAll('span:not(.block), img')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            (box.left < bounds.left - 2 ||
              box.right > bounds.right + 2 ||
              box.top < bounds.top - 2 ||
              box.bottom > bounds.bottom + 2)
          );
        })
        .map((element) => `slide ${index + 1}: ${element.textContent || element.outerHTML}`);
    }),
  );
  expect(outside).toEqual([]);

  const pictures = page.locator('.slide-stage img');
  expect(await pictures.count()).toBeGreaterThan(0);
  for (const src of await pictures.evaluateAll((images) =>
    images.map((image) => image.getAttribute('src') ?? ''),
  )) {
    expect((await page.request.get(src)).status(), src).toBe(200);
  }
});

test('nothing links to the talk and the sitemap leaves it out', async ({ page, request }) => {
  for (const linked of ['/', '/blog/']) {
    await page.goto(linked);
    await expect(page.locator('a[href^="/talks/"]')).toHaveCount(0);
  }
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('/blog/');
  expect(sitemap).not.toContain('/talks/');
});
