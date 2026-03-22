import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry once on CI — enough to catch flakes without exhausting timeout */
  retries: process.env.CI ? 1 : 0,
  /* Use half available CPUs on CI (sharding handles the rest) */
  workers: process.env.CI ? '50%' : undefined,
  /* Increase test timeout on CI — WebKit on Linux needs more headroom */
  timeout: process.env.CI ? 60_000 : 30_000,
  /* Reporter to use */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Include origin header so CSRF validation passes for API requests */
    extraHTTPHeaders: {
      origin: 'http://localhost:3000',
    },

    /* Disable CSS animations/transitions so Playwright doesn't wait for element stability */
    reducedMotion: 'reduce',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* CI needs more time for elements to stabilize after page load (hydration + layout settling) */
    actionTimeout: process.env.CI ? 20_000 : 5_000,

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers
   * - chromium: Desktop Chrome (covers Blink engine + desktop viewport)
   * - Mobile Safari: iPhone 12 / WebKit (covers WebKit engine + mobile viewport)
   *
   * Dropped: 'webkit' desktop (same engine as Mobile Safari, redundant)
   *          'Mobile Chrome' (same engine as chromium, viewport coverage via Mobile Safari)
   *          'firefox' (Gecko engine — zero browser-specific test skips, <3% mobile share,
   *                     Blink + WebKit already cover the two dominant rendering engines)
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.CI
      ? []
      : [
          {
            name: 'Mobile Safari' as const,
            use: {
              ...devices['iPhone 12'],
            },
          },
        ]),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
