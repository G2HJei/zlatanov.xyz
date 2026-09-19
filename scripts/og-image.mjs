/**
 * Renders the committed brand images with Playwright's Chromium:
 *   public/og-default.png         1200x630 social preview
 *   public/favicon/favicon-*.png  16, 32 and 64 px rasters of public/favicon.svg
 * Run with `npm run og:image` after changing the slogan, the colours or the SVG mark;
 * the PNGs are committed so builds stay dependency-free.
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
  panel: '#111111',
  ink: '#ffffff',
  inkMuted: '#b0b0b0',
  inkFaint: '#666666',
  line: '#333333',
  accent: '#20c20e',
  accentDim: '#1a9b0b',
  glow: 'rgb(32 194 14 / 0.35)',
};

const og = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format('woff2'); font-weight: 100 900; }
  @font-face { font-family: Mono; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 100 800; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; padding: 64px 80px; background: ${colour.surface}; color: ${colour.ink};
         font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
  .bar { position: absolute; inset: 0 0 auto 0; height: 10px; background: linear-gradient(90deg, ${colour.accent}, ${colour.accentDim}); }
  .logo { font-family: Mono, monospace; font-size: 32px; font-weight: 700; }
  .logo::before { content: '> '; color: ${colour.accent}; }
  .slogan { margin-top: 40px; padding: 40px 48px; background: ${colour.panel}; border: 1px solid ${colour.line}; border-radius: 16px;
            font-family: Mono, monospace; font-size: 52px; line-height: 1.25; font-weight: 600; color: ${colour.accent}; text-shadow: 0 0 24px ${colour.glow}; }
  .slogan::before { content: '$ '; color: ${colour.inkFaint}; }
  .footer { display: flex; justify-content: space-between; align-items: baseline; font-size: 28px; color: ${colour.inkMuted}; }
  .footer strong { color: ${colour.ink}; font-weight: 600; }
</style></head>
<body>
  <div class="bar"></div>
  <div>
    <div class="logo">${SITE.domain}</div>
    <div class="slogan">${SITE.slogan}</div>
  </div>
  <div class="footer"><strong>${SITE.name}</strong><span>Java consultant for TDD, DDD and CI/CD</span></div>
</body></html>`;

const svg = readFileSync(path.join(root, 'public', 'favicon.svg')).toString('base64');
const favicon = (size) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: transparent; }
  img { display: block; width: ${size}px; height: ${size}px; }
</style></head>
<body><img src="data:image/svg+xml;base64,${svg}" alt=""></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

await page.setContent(og, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, 'public', 'og-default.png');
await page.screenshot({ path: out });
console.log(`wrote ${path.relative(root, out)}`);

for (const size of [16, 32, 64]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(favicon(size), { waitUntil: 'load' });
  const file = path.join(root, 'public', 'favicon', `favicon-${size}.png`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log(`wrote ${path.relative(root, file)}`);
}

await browser.close();
