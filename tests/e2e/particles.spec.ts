import { expect, test } from '@playwright/test';

const canvas = 'canvas.particles';

/** Number of painted (non-transparent) pixels, sampled on a coarse stride. */
const paintedPixels = (element: HTMLCanvasElement) => {
  const context = element.getContext('2d');
  if (!context || element.width === 0 || element.height === 0) return 0;
  const { data } = context.getImageData(0, 0, element.width, element.height);
  let painted = 0;
  for (let i = 3; i < data.length; i += 4 * 7) if ((data[i] ?? 0) > 0) painted++;
  return painted;
};

test('the particle background draws behind the page without catching the pointer', async ({
  page,
}) => {
  await page.goto('/');
  const particles = page.locator(canvas);

  await expect(particles).toHaveAttribute('aria-hidden', 'true');
  await expect(particles).toHaveCSS('pointer-events', 'none');
  await expect(particles).toHaveCSS('position', 'fixed');
  await expect.poll(() => particles.evaluate(paintedPixels)).toBeGreaterThan(0);

  // Whatever sits under the middle of the viewport, it is page content, not the canvas.
  const hit = await page.evaluate(() => {
    const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return element?.tagName.toLowerCase();
  });
  expect(hit).not.toBe('canvas');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the particle canvas stays hidden and blank', async ({ page }) => {
    await page.goto('/');
    const particles = page.locator(canvas);
    await expect(particles).toBeHidden();
    await page.waitForTimeout(300);
    expect(await particles.evaluate(paintedPixels)).toBe(0);
  });
});
