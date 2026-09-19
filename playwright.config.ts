import { defineConfig, devices } from '@playwright/test';

// `PORT=4399 npx playwright test` when 4321 is taken by a dev server.
const port = Number(process.env.PORT ?? 4321);
const baseURL = `http://localhost:${port}/`;

/**
 * Smoke tests run against the production build in `dist/`, served by scripts/serve-dist.mjs
 * (plain Node, mirrors the nginx rules, no detached process to leak between runs).
 * `npm run test:e2e` builds first via the `pretest:e2e` script.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve-dist.mjs ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
