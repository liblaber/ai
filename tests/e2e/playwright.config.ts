/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, 'playwright/.auth/user.json');

export const CHROME_USE_PROPERTIES = {
  ...devices['Desktop Chrome'],

  // Show browser window during test execution (only in non-CI environments)
  headless: !!process.env.CI,

  // Set larger viewport for more reliable testing
  viewport: { width: 1280, height: 720 },

  // This reuses the initial user session cookie
  storageState: STORAGE_STATE,

  // Extra options for stability
  launchOptions: {
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  },
};

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './',

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests. */
  workers: 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take the screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video for every run */
    video: 'on',

    /* Navigation timeout */
    navigationTimeout: 60000,

    /* Action timeout */
    actionTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'login',
      testMatch: 'setup/login.ts',
    },
    {
      name: 'initial-data-source',
      testMatch: 'setup/initial-data-source.ts',
      dependencies: ['login'],
      use: CHROME_USE_PROPERTIES,
    },
    {
      name: 'chromium',
      dependencies: ['initial-data-source'],
      use: CHROME_USE_PROPERTIES,
    },
  ],
});
