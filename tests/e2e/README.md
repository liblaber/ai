# E2E Tests for liblab.ai

This directory contains end-to-end tests for the liblab.ai application using Playwright.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

### Prerequisites

Make sure the main application is running. You can start it from the parent directory:

```bash
# For local development
cd ..
npm run dev

# For Docker
cd ..
pnpm run quickstart

# For production
cd ..
npm run start
```

### Test Commands

1. **Run tests with browser visible (default):**

```bash
npm test
```

2. **Run tests with browser visible (explicit headed mode):**

```bash
npm run test:headed
```

3. **Run tests with Playwright UI:**

```bash
npm run test:ui
```

4. **Run tests in debug mode:**

```bash
npm run test:debug
```

5. **Run tests in headless mode:**

```bash
npm run test:headless
```

6. **View test report:**

```bash
npm run report
```

## Test Flow

The main test (`user-onboarding-flow.spec.ts`) follows this user journey:

1. **Navigate to Application** - Opens the base URL (default: http://localhost:3000)
2. **Handle Telemetry Consent** - If the telemetry consent page appears, clicks "Decline"
3. **Connect Sample Database** - If the data source connection page appears, clicks "Connect" for the sample database
4. **Submit Message** - On the homepage, enters "Build hello world application with Hello World! h1 title" and submits
5. **The Chat Loads, Generates the App and Runs it** - The chat and the preview load, eventually the built app starts running in the preview

## Configuration

The tests are configured in `playwright.config.ts`:

- **Browser**: Chromium with headless mode disabled (browser window visible)
- **Base URL**: Uses `BASE_URL` environment variable or defaults to `http://localhost:3000`
- **Screenshots**: Automatically taken on failures
- **Videos**: Recorded on every test run
- **Web Server**: **Manual** - You must start your application before running tests

## Environment Variables

- `BASE_URL`: The base URL of your application (defaults to `http://localhost:3000`)
- `CI`: Set to `true` in CI environments to enable retries and headless mode

## Common Issues

1. **Browser not visible**: Make sure `headless: false` is set in `playwright.config.ts`
2. **Tests failing**: Check that the main application is running on the correct port (`http://localhost:3000`)
3. **Application not running**: Start your app with `npm run dev`, `pnpm run quickstart`, or `docker compose up`
4. **Selectors not working**: There may have been some updates to the UI components
5. **Slow tests**: Increase timeouts in the config if needed

## Adding New Tests

Create new test files in the `tests/` directory following the pattern:

```typescript
import { test, expect } from '@playwright/test';

test('Your test name', async ({ page }) => {
  // Your test code here
});
```
