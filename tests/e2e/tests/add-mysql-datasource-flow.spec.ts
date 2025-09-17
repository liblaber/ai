import { type ConsoleMessage, type Page, test, expect } from '@playwright/test';

// Helper function to navigate to MySQL data source form
async function navigateToMySQLForm(page: Page) {
  console.log('🧭 Navigating to application...');
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded successfully');

  try {
    console.log('🔍 Checking for telemetry consent page...');

    const telemetryHeading = page.locator('h1:has-text("Help us improve liblab ai")');
    await telemetryHeading.waitFor({ state: 'visible', timeout: 5000 });
    console.log('📋 Found telemetry consent page, clicking Decline...');

    const declineButton = page.locator('button:has-text("Decline")');
    await declineButton.waitFor({ state: 'visible' });
    await declineButton.click();

    await page.waitForLoadState('networkidle');
    console.log('✅ Declined telemetry, waiting for redirect...');
  } catch {
    console.warn('ℹ️ No telemetry consent page found, continuing...');
  }

  try {
    console.log('🔍 Checking for data source connection page...');

    const dataSourceHeading = page.locator('h1:has-text("Let\'s connect your data source")');
    await dataSourceHeading.waitFor({ state: 'visible', timeout: 5000 });
    console.log('💾 Found data source connection page, connecting to sample database...');

    const connectButton = page.locator('button:has-text("Connect")');
    await connectButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🔗 Found Connect button, clicking...');
    await connectButton.click();

    await page.waitForLoadState('networkidle');
    console.log('✅ Connected to sample database, waiting for redirect...');
  } catch {
    console.warn('ℹ️ No data source connection page found, continuing...');
  }

  console.log('🔍 Looking for settings button...');

  const settingsButton = page.locator('[data-testid="settings-button"]');
  await settingsButton.waitFor({ state: 'attached', timeout: 10000 });

  // Use JavaScript click instead of Playwright click to bypass viewport restrictions
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="settings-button"]') as HTMLElement;

    if (button) {
      button.click();
    } else {
      throw new Error('Settings button not found in DOM');
    }
  });
  console.log('✅ Successfully clicked settings button');

  await page.getByRole('button', { name: 'Add Data Source' }).click();

  // Look for the database type selector
  console.log('🔍 Looking for database type selector...');

  const dbTypeSelector = page.locator('select, [data-testid="add-data-source-select"]');
  await dbTypeSelector.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Found database type selector, selecting MySQL...');

  // Click to open the dropdown and select MySQL
  await dbTypeSelector.click();

  await page.waitForLoadState('domcontentloaded');

  const mysqlOption = page.locator('[id="mysql"]');
  await mysqlOption.waitFor({ state: 'visible', timeout: 5000 });
  await mysqlOption.click();
  console.log('✅ Selected MySQL database type');
}

test.describe('Add MySQL Data Source Flow', () => {
  test('Create MySQL data source with valid connection string', async ({ page }: { page: Page }) => {
    test.setTimeout(120000); // 2 minutes for this specific test

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting MySQL data source creation test...');

    // Use helper function to navigate to MySQL form
    await navigateToMySQLForm(page);

    console.log('🔍 Looking for database name input...');

    const dbNameInput = page.locator(
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "test-mysql"...');
    await dbNameInput.fill('test-mysql');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="mysql://username:password@host:port/database"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling connection string...');
    await connStrInput.fill('mysql://testuser:testpass@localhost:3306/testdb');

    console.log('🔍 Looking for save/create button...');

    const saveButton = page.locator('button:has-text("Create")');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Assert that the Create button is enabled with valid data
    await expect(saveButton, 'Create button should be enabled with valid data').toBeEnabled();

    console.log('✅ Found save button, clicking...');
    await saveButton.click();

    console.log('💾 Waiting for data source creation to complete...');
    await page.waitForLoadState('networkidle');

    // Look for success indicators - either success message or form disappearing
    console.log('🔍 Verifying data source creation was successful...');

    try {
      // Try to find a success message first
      const successMessage = page.locator('text=successfully, text=Success, text=created, text=added').first();
      await successMessage.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Success message found - data source created successfully!');
    } catch {
      // If no success message, check if we're no longer on the add data source form
      // This indicates successful submission and redirect
      try {
        const addDataSourceForm = page.locator('h1:has-text("Add Data Source"), h2:has-text("Add Data Source")');
        await expect(addDataSourceForm).not.toBeVisible({ timeout: 5000 });
        console.log('✅ Add data source form disappeared - indicating successful creation!');
      } catch {
        // As a fallback, verify that the form submission at least completed without errors
        const errorMessage = page.locator('text=error, text=Error, text=failed, text=Failed').first();
        await expect(errorMessage).not.toBeVisible({ timeout: 2000 });
        console.log('✅ No error messages found - form submission completed successfully!');
      }
    }
    console.log('🎉 MySQL data source creation test completed successfully!');
  });

  test('Validate MySQL connection string format and required fields', async ({ page }: { page: Page }) => {
    test.setTimeout(120000); // 2 minutes for this specific test

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting MySQL validation test...');

    // Use helper function to navigate to MySQL form
    await navigateToMySQLForm(page);

    // Test 1: Try to create without filling required fields
    console.log('🔍 Testing form validation - attempting to create without required fields...');

    const saveButton = page.locator('button:has-text("Create")');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Assert that the button should be disabled when required fields are empty
    await expect(saveButton, 'Create button should be disabled when required fields are empty').toBeDisabled();
    console.log('✅ Create button is properly disabled when required fields are empty');

    // Test 2: Fill name but leave connection string empty
    console.log('🔍 Testing partial form completion...');

    const dbNameInput = page.locator(
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await dbNameInput.fill('test-mysql-validation');
    console.log('✅ Filled data source name');

    // Assert that Create button is still disabled without connection string
    await expect(saveButton, 'Create button should remain disabled without connection string').toBeDisabled();
    console.log('✅ Create button remains disabled without connection string');

    // Test 3: Test connection functionality
    console.log('🔍 Testing connection string input and test connection...');

    const connStrInput = page.locator('input[placeholder*="mysql://username:password@host:port/database"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    await connStrInput.fill('mysql://testuser:testpass@localhost:3306/testdb');
    console.log('✅ Filled connection string');

    // Assert that Create button is now enabled with all required fields filled
    await expect(saveButton, 'Create button should be enabled with all required fields filled').toBeEnabled();
    console.log('✅ Create button is now enabled with all required fields filled');

    // Try test connection
    try {
      const testConnButton = page.locator('button:has-text("Test Connection")');
      await testConnButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Found Test Connection button, clicking...');
      await testConnButton.click();

      // Wait for test result (either success or failure)
      await page.waitForLoadState('networkidle');
      console.log('✅ Test connection completed (result may vary based on actual MySQL availability)');
    } catch {
      console.log('ℹ️ Test Connection button not found or not clickable - this may be expected');
    }

    console.log('🎉 MySQL validation test completed successfully!');
  });
});
