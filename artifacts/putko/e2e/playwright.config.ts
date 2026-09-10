import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Browser regression suite for the Host workspace. It runs against the
// already-running workflows through the shared proxy (web on `/`, API on
// `/api`), so start `artifacts/putko: web` and `artifacts/api-server: API
// Server` first. The API's development-only test-auth routes are required.
//
//   pnpm --filter @workspace/putko run test:e2e            # all viewports
//   pnpm --filter @workspace/putko run test:e2e -- --project=mobile
//
// Chromium: Playwright's own download is not used; the workspace binary is
// picked up from PLAYWRIGHT_CHROMIUM_PATH or /repl/tools/bin/chromium.

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:80';

const chromiumCandidates = [process.env.PLAYWRIGHT_CHROMIUM_PATH, '/repl/tools/bin/chromium'].filter(
  (candidate): candidate is string => Boolean(candidate),
);
const executablePath = chromiumCandidates.find((candidate) => existsSync(candidate));

const launchOptions = {
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
};

export default defineConfig({
  testDir: './host',
  outputDir: './.results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'en-GB',
    timezoneId: 'Europe/Bratislava',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 }, launchOptions },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true, launchOptions },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
});
