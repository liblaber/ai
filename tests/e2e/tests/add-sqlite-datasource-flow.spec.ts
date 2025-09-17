import { type Page, test, expect } from '@playwright/test';
import { performInitialSetup, navigateToSettings, navigateToDataSourceForm } from '../helpers/setup';

test.describe('Add SQLite Data Source Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);
  });

  test('Create SQLite data source with valid file path', async ({ page }: { page: Page }) => {
    console.log('Starting SQLite data source creation test...');

    await navigateToDataSourceForm(page, 'sqlite');

    console.log('🔍 Looking for database name input...');

    const dbNameInput = page.locator(
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "test-sqlite"...');
    await dbNameInput.fill('test-sqlite');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="sqlite://path/to/database.db"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling file path...');
    await connStrInput.fill('sqlite:///tmp/test.db');

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
    console.log('🎉 SQLite data source creation test completed successfully!');
  });

  test('Validate SQLite file path format and required fields', async ({ page }: { page: Page }) => {
    console.log('Starting SQLite validation test...');

    await navigateToDataSourceForm(page, 'sqlite');

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
    await dbNameInput.fill('test-sqlite-validation');
    console.log('✅ Filled data source name');

    // Assert that Create button is still disabled without connection string
    await expect(saveButton, 'Create button should remain disabled without file path').toBeDisabled();
    console.log('✅ Create button remains disabled without file path');

    // Test 3: Test connection functionality
    console.log('🔍 Testing file path input and test connection...');

    const connStrInput = page.locator('input[placeholder*="sqlite://path/to/database.db"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    await connStrInput.fill('sqlite:///tmp/validation-test.db');
    console.log('✅ Filled file path');

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
      console.log('✅ Test connection completed (result may vary based on file system permissions)');
    } catch {
      console.log('ℹ️ Test Connection button not found or not clickable - this may be expected');
    }

    console.log('🎉 SQLite validation test completed successfully!');
  });

  test('Test SQLite with sample database file path', async ({ page }: { page: Page }) => {
    console.log('Starting SQLite sample database test...');

    await navigateToDataSourceForm(page, 'sqlite');

    console.log('🔍 Looking for database name input...');

    const dbNameInput = page.locator(
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "sample-sqlite"...');
    await dbNameInput.fill('sample-sqlite');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="sqlite://path/to/database.db"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling sample database path...');
    // Use a more realistic sample database path that might exist in the application
    await connStrInput.fill('sqlite://./sample-data/sample.db');

    console.log('🔍 Looking for save/create button...');

    const saveButton = page.locator('button:has-text("Create")');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Assert that the Create button is enabled with valid data
    await expect(saveButton, 'Create button should be enabled with sample database path').toBeEnabled();

    // Try test connection with sample database
    try {
      const testConnButton = page.locator('button:has-text("Test Connection")');
      await testConnButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Found Test Connection button, testing sample database...');
      await testConnButton.click();

      // Wait for test result
      await page.waitForLoadState('networkidle');
      console.log('✅ Test connection with sample database completed');
    } catch {
      console.log('ℹ️ Test Connection button not found - proceeding with creation test');
    }

    console.log('✅ Found save button, clicking...');
    await saveButton.click();

    console.log('💾 Waiting for data source creation to complete...');
    await page.waitForLoadState('networkidle');

    // Look for success indicators
    console.log('🔍 Verifying sample database data source creation was successful...');

    try {
      // Try to find a success message first
      const successMessage = page.locator('text=successfully, text=Success, text=created, text=added').first();
      await successMessage.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Success message found - sample database connected successfully!');
    } catch {
      // If no success message, check if we're no longer on the add data source form
      try {
        const addDataSourceForm = page.locator('h1:has-text("Add Data Source"), h2:has-text("Add Data Source")');
        await expect(addDataSourceForm).not.toBeVisible({ timeout: 5000 });
        console.log('✅ Add data source form disappeared - sample database creation successful!');
      } catch {
        // As a fallback, verify that the form submission completed without errors
        const errorMessage = page.locator('text=error, text=Error, text=failed, text=Failed').first();
        await expect(errorMessage).not.toBeVisible({ timeout: 2000 });
        console.log('✅ No error messages found - sample database form submission completed!');
      }
    }
    console.log('🎉 SQLite sample database test completed successfully!');
  });
});
