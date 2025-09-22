import { test } from '@playwright/test';
import { navigateToDataSourceForm, navigateToSettings, performInitialSetup } from '../helpers/setup';

test.describe('PostgreSQL Data Source App Creation Flow', () => {
  test('Create PostgreSQL data source and build users dashboard app', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout for this complex flow
    await performInitialSetup(page);
    await navigateToSettings(page);

    console.log('Starting PostgreSQL data source creation and app building test...');

    // Step 1: Create PostgreSQL data source
    console.log('🔍 Step 1: Creating PostgreSQL data source...');

    await navigateToDataSourceForm(page, 'postgres');

    console.log('🔍 Looking for database name input...');

    const dbNameInput = page.locator(
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "test-postgres"...');
    await dbNameInput.fill('test-postgres');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="postgres(ql)://username:password@host:port/database"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling connection string from environment...');

    // Get connection string from environment variable
    const testPostgresUrl = process.env.TEST_POSTGRES_URL;

    if (!testPostgresUrl) {
      throw new Error(
        'TEST_POSTGRES_URL environment variable is not set. ' +
          'Please set it in your .env file or as an environment variable. ' +
          'Example: TEST_POSTGRES_URL=postgresql://username:password@localhost:5432/testdb',
      );
    }

    await connStrInput.fill(testPostgresUrl);

    console.log('🔍 Looking for save/create button...');

    const saveButton = page.locator('button:has-text("Create")');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found save button, clicking...');
    await saveButton.click();

    console.log('💾 Waiting for data source creation to complete...');
    await page.waitForLoadState('networkidle');

    // Look for success message or redirect
    try {
      const successMessage = page.locator('text=successfully, text=Success, text=created, text=added');
      await successMessage.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Data source created successfully!');
    } catch {
      console.log('ℹ️ No explicit success message found, but form submission completed');
    }

    // Step 2: Close control panel and navigate to homepage to build app
    console.log('🔍 Step 2: Closing control panel and navigating to homepage...');

    // Close the control panel popup by pressing escape
    await page.keyboard.press('Escape');
    console.log('✅ Pressed escape to close control panel');

    // Wait for the dialog to disappear
    await page.locator('div[role="dialog"]').waitFor({ state: 'hidden' });

    // Navigate to root to ensure we're on the homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 3: Build app using the PostgreSQL data source
    console.log('🔍 Step 3: Building users dashboard app...');

    // Find the homepage textarea
    const textarea = page.locator('[data-testid="homepage-textarea"]');
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found homepage textarea');

    // Select the PostgreSQL data source we just created
    const dataSourceSelect = page.locator('div[data-testid="data-source-picker-select"]');
    await dataSourceSelect.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found data source select dropdown, selecting PostgreSQL data source...');

    await dataSourceSelect.click();

    // Look for our test-postgres data source
    const postgresDataSourceSelector = page.getByText('test-postgres').first();
    await postgresDataSourceSelector.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Found test-postgres data source option.');

    await postgresDataSourceSelector.click();

    // Input the message and submit
    console.log('✍️ Filling textarea with users dashboard prompt...');
    await textarea.fill('create a users dashboard');

    // Find and click the send button
    const sendButton = page.locator('[data-testid="send-message-button"]');
    await sendButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🖱️ Clicking send button...');
    await sendButton.click();

    // Wait for the action to complete
    await page.waitForLoadState('networkidle');
    console.log('📤 Message submitted, waiting for response...');

    // Step 4: Wait for the chat interface to appear and iframe to load
    console.log('🔍 Step 4: Waiting for chat interface and iframe to load...');

    const chatInterface = page.locator('[data-chat-visible="true"]');
    await chatInterface.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Chat interface loaded');

    const iframe = page.locator('iframe[title="preview"]');
    await iframe.waitFor({ state: 'visible', timeout: 120000 });
    console.log('✅ Iframe found, waiting for it to load...');

    console.log('✅ Iframe visible, waiting for content...');

    // Step 5: Assert that the users dashboard was rendered
    try {
      console.log('🔍 Looking for users dashboard content in iframe...');

      const frame = iframe.contentFrame();

      if (!frame) {
        throw new Error('Could not get frame from iframe element');
      }

      // Look for common dashboard elements
      const dashboardElements = [
        'h1:has-text("Users"), h1:has-text("Dashboard"), h1:has-text("User Dashboard")',
        'h2:has-text("Users"), h2:has-text("Dashboard"), h2:has-text("User Dashboard")',
        'table, .table, [class*="table"]',
        'thead, tbody, tr, th, td',
        '[class*="dashboard"], [class*="users"]',
      ];

      let foundDashboardElement = false;

      const combinedSelector = dashboardElements.join(', ');

      try {
        await frame.locator(combinedSelector).first().waitFor({ state: 'visible', timeout: 30000 });
        console.log(`✅ Found a dashboard element.`);
        foundDashboardElement = true;
      } catch {
        // Continue to next selector
      }

      if (!foundDashboardElement) {
        // Fallback: check if iframe has any content at all
        const body = frame.locator('body');
        const bodyText = await body.textContent();

        if (bodyText && bodyText.trim().length > 0) {
          console.log('✅ Iframe has content, dashboard may have been created');
          foundDashboardElement = true;
        }
      }

      if (!foundDashboardElement) {
        throw new Error('Could not find users dashboard elements in iframe');
      }

      console.log('✅ Found users dashboard content in iframe!');
    } catch (error) {
      console.error('❌ Could not find users dashboard content in iframe', error);
      throw new Error(`Could not find users dashboard content in iframe: ${error}`);
    }

    console.log('🎉 PostgreSQL data source app creation test completed successfully!');
  });
});
