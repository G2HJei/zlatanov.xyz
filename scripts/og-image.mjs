/**
 * Renders public/og-default.png (1200x630) from an inline HTML template using
 * Playwright's Chromium. Run with `npm run og:image` after changing the copy
 * or the brand colours; the PNG is committed so builds stay dependency-free.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = readFileSync(
  path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
).toString('base64');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; padding: 72px 80px; background: #0c0a09; color: #f5f5f4;
         font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
  .bar { position: absolute; inset: 0 0 auto 0; height: 10px; background: #2dd4bf; }
  .eyebrow { font-family: ui-monospace, Consolas, monospace; color: #2dd4bf; font-size: 26px; letter-spacing: 0.02em; }
  h1 { margin: 20px 0 0; font-size: 74px; line-height: 1.05; letter-spacing: -0.025em; font-weight: 600; max-width: 1000px; text-wrap: balance; }
  .footer { display: flex; justify-content: space-between; align-items: baseline; font-size: 28px; color: #a8a29e; }
  .footer strong { color: #f5f5f4; font-weight: 600; }
</style></head>
<body>
  <div class="bar"></div>
  <div>
    <div class="eyebrow">Independent Java consultant · TDD · DDD · CI/CD</div>
    <h1>Ship Java systems you can change with confidence.</h1>
  </div>
  <div class="footer"><strong>Boyan Zlatanov</strong><span>zlatanov.xyz</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, 'public', 'og-default.png');
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${path.relative(root, out)}`);
