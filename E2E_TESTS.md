# E2E Tests for liblab.ai

This project includes comprehensive end-to-end tests using Playwright to ensure the application works correctly from a user's perspective.

## Quick Start

### Prerequisites

1. Make sure you have Node.js installed (version 18+)
2. Install project dependencies: `npm install`
3. **Start your application** - The tests expect the app to be running on `http://localhost:3000`
   - For local development: `npm run dev`
   - For Docker: `pnpm run quickstart` or `docker-compose up`
   - For production: `npm run start`

### Running Tests

#### Option 1: Using the convenience script (Recommended)

```bash
# Run tests with browser visible (default)
./run-e2e-tests.sh

# Run tests with Playwright UI
./run-e2e-tests.sh ui

# Run tests in debug mode
./run-e2e-tests.sh debug

# Run tests in headless mode
./run-e2e-tests.sh headless
```

#### Option 2: Direct commands

```bash
# Navigate to e2e-tests directory
cd e2e-tests

# Run tests with browser visible
npm run test:headed

# Run tests with Playwright UI
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests in headless mode
npm test
```

**Important**: Make sure your application is running before executing the tests!

## Test Flow

The main test (`user-onboarding-flow.spec.ts`) follows this complete user journey:

1. **Navigate to Application** - Opens the base URL (default: http://localhost:3000)
2. **Handle Telemetry Consent** - If the telemetry consent page appears, clicks "Decline"
3. **Connect Sample Database** - If the data source connection page appears, clicks "Connect" for the sample database
4. **Submit Message** - On the homepage, enters "Build a revenue dashboard" and submits

## Configuration

### Environment Variables

- `BASE_URL`: The base URL of your application (defaults to `http://localhost:3000`)
- `CI`: Set to `true` in CI environments to enable retries and headless mode

### Browser Configuration

- **Browser**: Chromium with headless mode disabled (browser window visible)
- **Viewport**: Desktop Chrome resolution
- **Screenshots**: Automatically taken at each step and on failures
- **Videos**: Recorded on test failures
- **Web Server**: **Manual** - You must start your application before running tests

## Test Structure

```
e2e-tests/
├── tests/
│   └── user-flow.spec.ts    # Main test file
├── test-results/            # Screenshots and videos (gitignored)
├── playwright.config.ts     # Playwright configuration
├── package.json            # Test dependencies
├── run-tests.sh           # Test runner script
└── README.md              # Detailed documentation
```

## Debugging

### Screenshots

The test automatically takes screenshots at each step:

- `step1-homepage.png` - Initial page load
- `step2-after-decline.png` - After declining telemetry
- `step3-after-connect.png` - After connecting to sample database
- `step4-before-input.png` - Before entering text
- `step5-after-submit.png` - After submitting message
- `step6-final.png` - Final state

### Console Logging

The test includes extensive console logging to help debug issues:

- Browser console messages
- Page errors
- Step-by-step progress
- Element selector information

### Manual Debugging

If tests are failing, you can:

1. **Run in debug mode**: `./run-e2e-tests.sh debug`
2. **Run with UI**: `./run-e2e-tests.sh ui`
3. **Check screenshots**: Look in `e2e-tests/test-results/`
4. **View test report**: `cd e2e-tests && npm run report`

## Troubleshooting

### Common Issues

1. **Browser not visible**: Make sure `headless: false` is set in `playwright.config.ts`
2. **Tests failing**: Check that the main application is running on the correct port (`http://localhost:3000`)
3. **Application not running**: Start your app with `npm run dev`, `pnpm run quickstart`, or `docker-compose up`
4. **Selectors not working**: The test uses multiple fallback selectors to find elements
5. **Slow tests**: Increase timeouts in the config if needed

### Element Selectors

The test uses multiple fallback selectors to find elements:

**Textarea selectors:**

- `textarea[placeholder*="chat"]`
- `textarea[placeholder*="message"]`
- `textarea[placeholder*="prompt"]`
- `textarea[placeholder*="Ask"]`
- `textarea[placeholder*="What"]`
- `textarea`
- `[data-testid="homepage-textarea"]`
- `.HomepageTextarea textarea`
- `[role="textbox"]`

**Send button selectors:**

- `button[type="submit"]`
- `button:has-text("Send")`
- `button:has-text("Submit")`
- `button[aria-label*="send"]`
- `button[aria-label*="submit"]`
- `[data-testid="send-button"]`
- `button:has-text("→")`
- `button:has-text("Send message")`

## Adding New Tests

Create new test files in `e2e-tests/tests/` following this pattern:

```typescript
import { test, expect } from '@playwright/test';

test('Your test name', async ({ page }) => {
  // Your test code here
  await page.goto('/');
  // ... more test steps
});
```

## CI/CD Integration

For CI/CD environments, set the `CI` environment variable:

```bash
CI=true npm test
```

This will:

- Run tests in headless mode
- Enable retries on failures
- Generate reports for CI systems

## Performance

- **Test Duration**: ~30-60 seconds (depending on network and app performance)
- **Screenshots**: ~6 screenshots per test run
- **Memory Usage**: ~100-200MB per test run
- **Browser Resources**: Chromium instance with visible window
