# E2E Tests for liblab.ai

This project includes comprehensive end-to-end tests using Playwright to ensure the application works correctly from a user's perspective.

## Quick Start

### Prerequisites

1. Make sure you have Node.js installed (version 18+)
2. Install project dependencies: `npm install`
3. **Start your application** - The tests expect the app to be running on `http://localhost:3000`
   - For local development: `npm run dev`
   - For Docker: `pnpm run quickstart` or `docker compose up`
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
4. **Submit Message** - On the homepage, enters "Build hello world application with Hello World! h1 title" and submits
5. **The Chat Loads and Runs the Built App** - The chat and the preview load, eventually the built app starts running in the preview

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
tests/e2e
├── tests/
│   └── user-onboarding-flow.spec.ts    # Main test file
├── test-results/            # Screenshots and videos (gitignored)
├── playwright-report/       # Test results as an html page (gitignored)
├── playwright.config.ts     # Playwright configuration
├── package.json            # Test dependencies
└── README.md              # Detailed documentation
```

## Debugging

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
3. **Check screenshots**: Look in `tests/e2e/test-results/`
4. **View test report**: `cd tests/e2e && npm run report`

## Troubleshooting

### Common Issues

1. **Browser not visible**: Make sure `headless: false` is set in `playwright.config.ts`
2. **Tests failing**: Check that the main application is running on the correct port (`http://localhost:3000`)
3. **Application not running**: Start your app with `npm run dev`, `pnpm run quickstart`, or `docker compose up`
4. **Selectors not working**: There may have been some updates to the UI components
5. **Slow tests**: Increase timeouts in the config if needed

## CI/CD Integration

For CI/CD environments, set the `CI` environment variable:

```bash
CI=true npm test
```

This will:

- Run tests in headless mode
- Enable retries on failures
- Generate reports for CI systems

The main e2e tests workflow is: [e2e-tests.yml](.github/workflows/e2e-tests.yml)
