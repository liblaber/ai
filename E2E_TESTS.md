# E2E Tests for liblab.ai

This project includes comprehensive end-to-end tests using Playwright to ensure the application works correctly from a user's perspective.

## Quick Start

### Prerequisites

1. Make sure you have Node.js installed (version 18+)
2. Install project dependencies: `pnpm install`
3. **Start your application** - The tests expect the app to be running on `http://localhost:3000`
   - For local development: `pnpm run dev`
   - For Docker: `pnpm run quickstart` or `docker compose up`
   - For production: `pnpm run start`

### Running Tests

#### Option 1: Using pnpm commands (Recommended)

```bash
# Run tests in default mode (browser visible in non-CI environments)
pnpm test:e2e

# Run tests with browser visible (explicit headed mode)
pnpm test:e2e:headed

# Run tests with Playwright UI
pnpm test:e2e:ui

# Run tests in debug mode
pnpm test:e2e:debug

# Run tests in headless mode
pnpm test:e2e:headless
```

#### Option 2: Direct commands in tests/e2e directory

```bash
# Navigate to e2e-tests directory
cd tests/e2e

# Run tests in default mode (browser visible in non-CI environments)
npm test

# Run tests with browser visible (explicit headed mode)
npm test:headed

# Run tests with Playwright UI
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests in headless mode, without visible browser
npm run test:headless
```

**Important**: Make sure your application is running before executing the tests!

## Test Flow

The main test (`user-onboarding-flow.spec.ts`) follows this complete user journey:

1. **Navigate to Application** - Opens the base URL (default: http://localhost:3000)
2. **Handle Telemetry Consent** - If the telemetry consent page appears, clicks "Decline"
3. **Connect Sample Database** - If the data source connection page appears, clicks "Connect" for the sample database
4. **Submit Message** - On the homepage, enters "Build hello world application with Hello World! h1 title" and submits
5. **The Chat Loads, Generates the App and Runs it** - The chat and the preview load, eventually the built app starts running in the preview

## Configuration

### Environment Variables

- `BASE_URL`: The base URL of your application (defaults to `http://localhost:3000`)
- `CI`: Set to `true` in CI environments to enable retries and headless mode

### Browser Configuration

- **Browser**: Chromium with headless mode disabled (browser window visible)
- **Viewport**: Desktop Chrome resolution
- **Screenshots**: Automatically taken on failures
- **Videos**: Recorded on every test run
- **Web Server**: **Manual** - You must start your application before running tests
