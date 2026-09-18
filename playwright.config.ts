import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4321/';

/**
 * Smoke tests run against `astro preview`, i.e. the production build in `dist/`.
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
    command: 'npx astro preview --ignore-lock',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
