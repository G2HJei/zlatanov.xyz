/**
 * Renders public/og-default.png, the 1200x630 social preview, with Playwright's Chromium.
 * It is the top of the home page: the header's logo and subtitle, then the slogan and its
 * `$ ` subtitle centred in the space below, over the particles and scanlines. Run with
 * `npm run og:image` after changing the slogan or the colours; the PNG is committed so
 * builds stay dependency-free. The favicons are not rendered here: they come ready-made
 * from the brand kit.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { SITE } from '../src/lib/site.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const font = (pkg, file) =>
  readFileSync(path.join(root, 'node_modules', pkg, 'files', file)).toString('base64');
const inter = font('@fontsource-variable/inter', 'inter-latin-wght-normal.woff2');
const mono = font('@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2');

// Keep in step with the tokens in src/styles/global.css.
const colour = {
  surface: '#0a0a0a',
  ink: '#ffffff',
  inkMuted: '#b0b0b0',
  line: '#333333',
  accent: '#20c20e',
  accentDim: '#1a9b0b',
  glow: 'rgb(32 194 14 / 0.35)',
};

// A still of the particle background (Particles.astro): dots joined by hairlines that fade
// with length. Seeded, so every run draws the same picture.
const particles = `
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const points = Array.from({length: 48}, () => [rand() * 1200, rand() * 630]);
  const ctx = document.querySelector('canvas').getContext('2d');
  ctx.strokeStyle = ctx.fillStyle = '${colour.accent}';
  for (const [i, a] of points.entries()) {
    for (const b of points.slice(i + 1)) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d < 170) {
        ctx.globalAlpha = 1 - d / 170;
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  for (const [x, y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }`;

// The header and hero at about 1.7x and 1.25x their size on the site, so they stay legible
// at the ~500px a feed shows. Scanlines are a pixel coarser than the site's for the same
// reason: finer ones turn to moiré when the image is scaled down.
const og = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format('woff2'); font-weight: 100 900; }
  @font-face { font-family: Mono; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 100 800; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; background: ${colour.surface}; color: ${colour.ink};
         font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  canvas { position: absolute; inset: 0; opacity: 0.25; }
  .scanlines { position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, transparent 0 3px, rgb(0 0 0 / 0.16) 3px 4px); }
  header { position: relative; display: flex; align-items: center; gap: 12px; padding: 28px 56px;
           border-bottom: 1px solid ${colour.line}; background: rgb(10 10 10 / 0.95); font-family: Mono, monospace; font-size: 34px; font-weight: 700; }
  .prompt { color: ${colour.accent}; font-size: 42px; }
  .cursor { width: 0.55em; height: 1.2em; background: ${colour.accent}; }
  .subtitle { margin-left: 10px; padding-left: 18px; border-left: 1px solid ${colour.line};
              font-size: 19px; font-weight: 400; letter-spacing: 0.025em; color: ${colour.inkMuted}; }
  main { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  h1 { margin: 0; font-size: 70px; line-height: 1.15; font-weight: 700; filter: drop-shadow(0 0 22px ${colour.glow});
       background-image: linear-gradient(135deg, ${colour.accent}, ${colour.accentDim}); background-clip: text; color: transparent; }
  p { margin: 22px 0 0; font-family: Mono, monospace; font-size: 26px; color: ${colour.inkMuted}; }
  p::before { content: '$ '; color: ${colour.accent}; }
</style></head>
<body>
  <canvas width="1200" height="630"></canvas>
  <header>
    <span class="prompt">&gt;</span><span>${SITE.logo}</span><span class="cursor"></span><span class="subtitle">${SITE.logoSubtitle}</span>
  </header>
  <main>
    <h1>${SITE.slogan}</h1>
    <p>${SITE.sloganSubtitle}</p>
  </main>
  <div class="scanlines"></div>
  <script>${particles}</script>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

await page.setContent(og, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, 'public', 'og-default.png');
await page.screenshot({ path: out });
console.log(`wrote ${path.relative(root, out)}`);

await browser.close();
