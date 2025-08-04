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

1. **Run tests in headless mode:**

```bash
npm test
```

2. **Run tests with browser visible:**

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

5. **View test report:**

```bash
npm run report
```

## Test Flow

The main test (`user-flow.spec.ts`) follows this user journey:

1. **Navigate to the application** - Opens the base URL
2. **Handle telemetry consent** - If the telemetry consent page appears, clicks "Decline"
3. **Connect to sample database** - If the data source connection page appears, clicks "Connect" for the sample database
4. **Submit a message** - On the homepage, enters "Build a revenue dashboard" and submits

## Configuration

The tests are configured in `playwright.config.ts`:

- **Browser**: Chromium with headless mode disabled (browser window visible)
- **Base URL**: Uses `BASE_URL` environment variable or defaults to `http://localhost:3000`
- **Web Server**: **Manual** - You must start your application before running tests
- **Screenshots**: Taken on test failures
- **Videos**: Recorded on test failures

## Environment Variables

- `BASE_URL`: The base URL of your application (defaults to `http://localhost:3000`)
- `CI`: Set to `true` in CI environments to enable retries and headless mode

## Troubleshooting

1. **Browser not visible**: Make sure `headless: false` is set in the config
2. **Tests failing**: Check that the main application is running on the correct port
3. **Selectors not working**: The test uses multiple fallback selectors to find elements
4. **Slow tests**: Increase timeouts in the config if needed

## Adding New Tests

Create new test files in the `tests/` directory following the pattern:

```typescript
import { test, expect } from '@playwright/test';

test('Your test name', async ({ page }) => {
  // Your test code here
});
```
