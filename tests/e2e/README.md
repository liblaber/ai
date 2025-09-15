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

- **Browser**: Chromium with headless mode disabled in development (browser window visible), headless in CI
- **Base URL**: Uses `BASE_URL` environment variable or defaults to `http://localhost:3000`
- **Screenshots**: Only taken on test failures
- **Videos**: Recorded on every test run
- **Retries**: 2 retries in CI environments, 0 retries locally
- **Timeouts**: Navigation (60s), Actions (30s)
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

### Table of Contents

- [Test Writing Approach](#test-writing-approach)
- [Writing Effective Playwright Tests](#writing-effective-playwright-tests)
  - [1. Use Data Test IDs for Reliable Element Selection](#1-use-data-test-ids-for-reliable-element-selection)
  - [2. Selector Strategy Priority](#2-selector-strategy-priority)
  - [3. Proper Wait Strategies and Timeouts](#3-proper-wait-strategies-and-timeouts)
  - [4. Working with Asynchronous Content](#4-working-with-asynchronous-content)
  - [5. Common Patterns and Tips](#5-common-patterns-and-tips)
- [Debugging Tests](#debugging-tests)
- [Performance Considerations](#performance-considerations)
- [Further Reading](#further-reading)

### Test Writing Approach

**File Organization:**

Create new test files in the `tests/` directory following this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name Tests', () => {
  test('Your specific test scenario', async ({ page }) => {
    // Your test code here
  });
});
```

**Start with the Happy Path:**

1. Write the main user flow first
2. Add error handling and edge cases later
3. Keep tests focused on one feature/flow

**Structure your tests using Arrange-Act-Assert:**

```typescript
test('User can create and submit a form', async ({ page }) => {
  // ARRANGE - Setup initial state and navigate to the page
  await page.goto('/form');

  // Wait for the form to be ready
  await page.locator('[data-testid="name-input"]').waitFor({ state: 'visible' });

  // ACT - Perform user actions
  await page.fill('[data-testid="name-input"]', 'John Doe');
  await page.fill('[data-testid="email-input"]', 'john@example.com');
  await page.click('[data-testid="submit-button"]');

  // ASSERT - Verify expected outcomes
  await expect(page.getByText('Form submitted successfully')).toBeVisible();
  await expect(page).toHaveURL('/success');
});
```

**Key Principles:**

- **Arrange**: Set up the test environment, navigate to pages, prepare data
- **Act**: Perform the user actions you want to test (clicks, typing, etc.)
- **Assert**: Verify that the expected outcomes occurred
- **One test, one scenario**: Each test should focus on a single user journey or feature
- **Descriptive test names**: Use clear, descriptive names that explain what the test does

### Writing Effective Playwright Tests

#### 1. Use Data Test IDs for Reliable Element Selection

**Best Practice**: Add `data-testid` attributes to UI elements you want to interact with in tests:

```tsx
// In your React component
<button data-testid="send-message-button">Send</button>
<textarea data-testid="homepage-textarea" />
<div data-testid="data-source-picker-select">Select Data Source</div>
```

```typescript
// In your test
const sendButton = page.locator('[data-testid="send-message-button"]');
const textarea = page.locator('[data-testid="homepage-textarea"]');
```

**Why data-testid?**

- More stable than CSS classes (which can change with styling)
- More reliable than text content (which can change with i18n)
- Explicit intent for testing
- Survives UI refactoring

#### 2. Selector Strategy Priority

Use selectors in this order of preference:

1. **Data test IDs** (most stable): `[data-testid="element-id"]`
2. **Semantic roles**: `page.getByRole('button', { name: 'Submit' })`
3. **Text content**: `page.getByText('Hello World')`
4. **CSS selectors** (least stable): `'.button-class'`

```typescript
// Good - stable selectors
const submitBtn = page.locator('[data-testid="submit-button"]');
const heading = page.getByRole('heading', { name: 'Welcome' });
const link = page.getByText('Learn More');

// Avoid - fragile selectors
const badBtn = page.locator('.btn.btn-primary.submit-btn');
```

#### 3. Proper Wait Strategies and Timeouts

**Always wait for elements before interacting:**

```typescript
// Wait for element to be visible before clicking
const button = page.locator('[data-testid="submit-btn"]');
await button.waitFor({ state: 'visible', timeout: 10000 });
await button.click();

// Wait for network requests to complete
await page.waitForLoadState('networkidle');

// Wait for specific content to appear
await expect(page.getByText('Success!')).toBeVisible({ timeout: 15000 });
```

**Timeout Guidelines:**

- **Fast interactions** (clicks, typing): 5-10 seconds
- **Page loads**: 15-30 seconds
- **API calls**: 15-30 seconds
- **Complex operations** (builds, deployments): 60-180 seconds

```typescript
test('Complex workflow', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes for entire test

  // Short timeout for quick interactions
  await page.locator('[data-testid="quick-btn"]').waitFor({ timeout: 5000 });

  // Longer timeout for API responses
  await expect(page.getByText('Data loaded')).toBeVisible({ timeout: 30000 });
});
```

#### 4. Working with Asynchronous Content

**Handle dynamic content properly:**

```typescript
// Wait for content that loads asynchronously
await page.waitForFunction(() => {
  const element = document.querySelector('[data-testid="dynamic-content"]');
  return element && element.textContent.trim() !== '';
});

// Wait for API responses
await page.waitForResponse((response) => response.url().includes('/api/data') && response.status() === 200);

// Handle iframe content
const iframe = page.locator('iframe[title="preview"]');
await iframe.waitFor({ state: 'attached' });
const frame = await iframe.contentFrame();
await frame.locator('h1').waitFor({ state: 'visible' });
```

#### 5. Common Patterns and Tips

**Form Interactions:**

```typescript
// Fill and submit forms
await page.fill('[data-testid="input-field"]', 'value');
await page.selectOption('[data-testid="dropdown"]', 'option-value');
await page.check('[data-testid="checkbox"]');
await page.click('[data-testid="submit"]');
```

**Navigation and URLs:**

```typescript
// Wait for navigation
await page.click('[data-testid="nav-link"]');
await page.waitForURL('/new-page');

// Verify current URL
await expect(page).toHaveURL('/expected-path');
```

**Content Verification:**

```typescript
// Check text content
await expect(page.getByText('Expected text')).toBeVisible();

// Check element attributes
await expect(page.locator('[data-testid="input"]')).toHaveValue('expected');

// Check element count
await expect(page.locator('[data-testid="list-item"]')).toHaveCount(3);
```

### Debugging Tests

**Test Results and Debugging Artifacts:**

- **Videos**: Located in `test-results/` folder, recorded for every test run
- **Screenshots**: Only taken on test failures, plus manual ones for debugging
- **Test Reports**: View comprehensive test results with videos using the HTML reporter

**Enable debugging features in your test:**

```typescript
test('Debug example', async ({ page }) => {
  // Enable console logging
  page.on('console', (msg) => console.log('Browser:', msg.text()));
  page.on('pageerror', (error) => console.log('Error:', error.message));

  // Add debug points
  console.log('🧭 Starting navigation...');
  await page.goto('/');

  console.log('🔍 Looking for element...');
  const element = page.locator('[data-testid="target"]');
  await element.waitFor({ state: 'visible' });

  // Take manual screenshots for debugging
  await page.screenshot({ path: 'debug-step-1.png' });

  // Pause execution to inspect manually
  await page.pause();
});
```

**Debugging Failed Tests - Step by Step:**

1. **View the test report** with `npm run report` to see all test results and videos in one place
2. **Check the video recording** in `test-results/` to see what actually happened (videos are recorded for every test)
3. **Review console logs** from both your test and the browser
4. **Check failure screenshots** automatically taken when tests fail
5. **Use `page.pause()`** to stop execution and inspect manually
6. **Add manual screenshots** at key points to understand the state
7. **Check network requests** with `page.waitForResponse()`

**Debugging Commands:**

```bash
# Run tests (HTML report is automatically generated)
npm test

# View the HTML report with videos and results
npm run report

# Run in debug mode (opens browser dev tools)
npx playwright test --debug

# Run specific test file
npx playwright test tests/your-test-file.spec.ts
```

### Performance Considerations

- **Avoid unnecessary waits**: Use specific wait conditions instead of `page.waitForTimeout()`
- **Parallel execution**: Tests run in parallel by default (disabled in CI), ensure they don't interfere
- **Built-in retries**: Tests automatically retry on CI (2 retries), no retries locally
- **Resource cleanup**: Close pages/contexts when needed for long test suites
- **Timeouts are pre-configured**: Navigation (60s), Actions (30s), Expect (15s) - adjust only if needed

### Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Locator Strategies](https://playwright.dev/docs/locators)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Configuration](https://playwright.dev/docs/test-configuration)
