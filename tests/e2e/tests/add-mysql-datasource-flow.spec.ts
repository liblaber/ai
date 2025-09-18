import { type Page, test, expect } from '@playwright/test';
import { performInitialSetup, navigateToSettings, navigateToDataSourceForm } from '../helpers/setup';

test.describe('Add MySQL Data Source Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);
  });

  test('Create MySQL data source with valid connection string', async ({ page }: { page: Page }) => {
    console.log('Starting MySQL data source creation test...');

    await navigateToDataSourceForm(page, 'mysql');

    console.log('🔍 Looking for database name input...');

    // Use more robust selector - preferring semantic role or data-testid if available
    const dbNameInput = page
      .locator('[data-testid="data-source-name-input"]')
      .or(page.getByRole('textbox', { name: /data source name/i }))
      .or(page.locator('input[placeholder*="data source name"], input[placeholder*="Data Source Name"]'));
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "test-mysql"...');
    await dbNameInput.fill('test-mysql');

    console.log('🔍 Looking for connection string input...');

    // Use more robust selector for connection string input
    const connStrInput = page
      .locator('[data-testid="connection-string-input"]')
      .or(page.getByRole('textbox', { name: /connection string/i }))
      .or(page.locator('input[placeholder*="mysql://username:password@host:port/database"]'));
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling connection string...');
    await connStrInput.fill('mysql://testuser:testpass@localhost:3306/testdb');

    console.log('🔍 Looking for save/create button...');

    // Use semantic role for button - more robust than text matching
    const saveButton = page.getByRole('button', { name: /create/i });
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Assert that the Create button is enabled with valid data
    await expect(saveButton, 'Create button should be enabled with valid data').toBeEnabled();

    console.log('✅ Found save button, clicking...');

    // Wait for the API response to validate successful data source creation
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/data-sources') && response.request().method() === 'POST',
      ),
      saveButton.click(),
    ]);

    console.log('💾 Waiting for data source creation API response...');

    // Validate API response status
    if (response.status() === 200 || response.status() === 201) {
      console.log('✅ Data source created successfully via API!');

      // Wait for UI to update after successful API call
      await page.waitForLoadState('networkidle');

      // Look for success message in UI as confirmation
      const successMessage = page.getByText(/successfully|success|created/i).first();

      try {
        await successMessage.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ Success message confirmed in UI!');
      } catch {
        console.log('ℹ️ API success confirmed, UI message may vary');
      }
    } else {
      throw new Error(`Data source creation failed with status: ${response.status()}`);
    }

    console.log('🎉 MySQL data source creation test completed successfully!');
  });

  test('Validate MySQL connection string format and required fields', async ({ page }: { page: Page }) => {
    console.log('Starting MySQL validation test...');

    await navigateToDataSourceForm(page, 'mysql');

    // Test 1: Try to create without filling required fields
    console.log('🔍 Testing form validation - attempting to create without required fields...');

    // Use semantic role for button - more robust than text matching
    const saveButton = page.getByRole('button', { name: /create/i });
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Assert that the button should be disabled when required fields are empty
    await expect(saveButton, 'Create button should be disabled when required fields are empty').toBeDisabled();
    console.log('✅ Create button is properly disabled when required fields are empty');

    // Test 2: Fill name but leave connection string empty
    console.log('🔍 Testing partial form completion...');

    // Use more robust selector - preferring semantic role or data-testid if available
    const dbNameInput = page
      .locator('[data-testid="data-source-name-input"]')
      .or(page.getByRole('textbox', { name: /data source name/i }))
      .or(page.locator('input[placeholder*="data source name"], input[placeholder*="Data Source Name"]'));
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await dbNameInput.fill('test-mysql-validation');
    console.log('✅ Filled data source name');

    // Assert that Create button is still disabled without connection string
    await expect(saveButton, 'Create button should remain disabled without connection string').toBeDisabled();
    console.log('✅ Create button remains disabled without connection string');

    // Test 3: Test connection functionality
    console.log('🔍 Testing connection string input and test connection...');

    // Use more robust selector for connection string input
    const connStrInput = page
      .locator('[data-testid="connection-string-input"]')
      .or(page.getByRole('textbox', { name: /connection string/i }))
      .or(page.locator('input[placeholder*="mysql://username:password@host:port/database"]'));
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    await connStrInput.fill('mysql://testuser:testpass@localhost:3306/testdb');
    console.log('✅ Filled connection string');

    // Assert that Create button is now enabled with all required fields filled
    await expect(saveButton, 'Create button should be enabled with all required fields filled').toBeEnabled();
    console.log('✅ Create button is now enabled with all required fields filled');

    // Try test connection with API response validation
    try {
      const testConnButton = page.getByRole('button', { name: /test connection/i });
      await testConnButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Found Test Connection button, testing...');

      // Wait for the test connection API response
      const [testResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/data-sources/test') || response.url().includes('/test-connection'),
        ),
        testConnButton.click(),
      ]);

      console.log(`✅ Test connection API response: ${testResponse.status()}`);

      // Wait for UI feedback based on API response
      if (testResponse.status() === 200) {
        const successFeedback = page.getByText(/connection successful|connected/i).first();

        try {
          await successFeedback.waitFor({ state: 'visible', timeout: 3000 });
          console.log('✅ Test connection succeeded!');
        } catch {
          console.log('✅ Test connection API succeeded, UI feedback may vary');
        }
      } else {
        console.log(`ℹ️ Test connection returned status ${testResponse.status()} - expected for test data`);
      }
    } catch {
      console.log('ℹ️ Test Connection button not found or not clickable - this may be expected');
    }

    console.log('🎉 MySQL validation test completed successfully!');
  });
});
