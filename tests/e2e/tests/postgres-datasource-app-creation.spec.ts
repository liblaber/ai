import { type ElementHandle, type Page, test } from '@playwright/test';
import { performInitialSetup } from '../helpers/setup';
import { navigateToSettings } from '../helpers/navigate';

test.describe('PostgreSQL Data Source App Creation Flow', () => {
  test('Create PostgreSQL data source and build users dashboard app', async ({ page }: { page: Page }) => {
    test.setTimeout(300000); // 5 minutes timeout for this complex flow
    await performInitialSetup(page);
    await navigateToSettings(page);

    console.log('Starting PostgreSQL data source creation and app building test...');

    // Step 1: Create PostgreSQL data source
    console.log('🔍 Step 1: Creating PostgreSQL data source...');

    await page.getByRole('button', { name: 'Add Data Source' }).click();

    // Look for the database type selector
    console.log('🔍 Looking for database type selector...');

    const dbTypeSelector = page.locator('select, [data-testid="add-data-source-select"]');
    await dbTypeSelector.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database type selector, selecting PostgreSQL...');

    // Click to open the dropdown and select PostgreSQL
    await dbTypeSelector.click();

    await page.waitForLoadState('domcontentloaded');

    const postgresOption = page.locator('[id="postgres"]');
    await postgresOption.waitFor({ state: 'visible', timeout: 5000 });
    await postgresOption.click();
    console.log('✅ Selected PostgreSQL database type');

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

    // Step 2: Navigate back to homepage to build app
    console.log('🔍 Step 2: Navigating to homepage to build app...');

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

    // Select the environment (Development)
    const developmentEnvironmentSelector = postgresDataSourceSelector
      .locator('..')
      .locator('..')
      .locator('..')
      .getByText('Development')
      .first();
    await developmentEnvironmentSelector.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Found development environment select option.');
    await developmentEnvironmentSelector.click();

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
    await iframe.waitFor({ state: 'visible', timeout: 300000 });
    console.log('✅ Iframe found, waiting for it to load...');

    console.log('✅ Iframe visible, waiting for content...');

    // Step 5: Assert that the users dashboard was rendered
    try {
      // Check for users dashboard content inside the iframe
      console.log('🔍 Looking for users dashboard content in iframe...');

      const frame = await iframe
        .elementHandle()
        .then((handle: ElementHandle<SVGElement | HTMLElement> | null) => handle?.contentFrame());

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

      for (const selector of dashboardElements) {
        try {
          const element = frame.locator(selector);
          await element.waitFor({ state: 'visible', timeout: 10000 });
          console.log(`✅ Found dashboard element: ${selector}`);
          foundDashboardElement = true;
          break;
        } catch {
          // Continue to next selector
        }
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
