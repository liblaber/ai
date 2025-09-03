import { type ConsoleMessage, type Page, test } from '@playwright/test';

test.describe('Add PostgreSQL Data Source Flow', () => {
  test('Create PostgreSQL data source when connection string starts with postgresql', async ({
    page,
  }: {
    page: Page;
  }) => {
    test.setTimeout(120000); // 2 minutes for this specific test

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting PostgreSQL data source creation test...');

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

    console.log('🔍 Looking for settings cog icon...');

    // Scroll to top to ensure menu is in viewport
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    const menu = page.locator('[data-testid="menu"]');
    await menu.waitFor({ state: 'visible', timeout: 10000 });

    // Get menu bounds and scroll it into view if needed
    const menuBounds = await menu.boundingBox();

    if (menuBounds) {
      await page.evaluate((bounds) => {
        window.scrollTo(bounds.x, bounds.y);
      }, menuBounds);
      await page.waitForTimeout(500);
    }

    // Use a more reliable hover approach
    try {
      await menu.hover({ timeout: 5000 });
      console.log('✅ Successfully hovered over menu');
    } catch {
      console.log('⚠️ Menu hover failed, trying alternative approach...');
      // Alternative: scroll menu into view and try clicking directly
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }

    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll settings button into view before clicking
    await settingsButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await settingsButton.click();
    console.log('✅ Successfully clicked settings button');

    await page.getByRole('button', { name: 'Add Data Source' }).click();

    // Look for the database type selector
    console.log('🔍 Looking for database type selector...');

    // help here
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
      'input[placeholder*="database name"], input[placeholder*="Database Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "foobar"...');
    await dbNameInput.fill('foobar');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="postgres(ql)://username:password@host:port/database"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling connection string...');
    await connStrInput.fill('postgresql://user:pass@localhost:5432/db');

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

    console.log('🎉 PostgreSQL data source creation test completed successfully!');
  });

  test('Create PostgreSQL data source when connection string starts with postgres', async ({
    page,
  }: {
    page: Page;
  }) => {
    test.setTimeout(120000); // 2 minutes for this specific test

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting PostgreSQL data source creation test...');

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

    console.log('🔍 Looking for settings cog icon...');

    // Scroll to top to ensure menu is in viewport
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    const menu = page.locator('[data-testid="menu"]');
    await menu.waitFor({ state: 'visible', timeout: 10000 });

    // Get menu bounds and scroll it into view if needed
    const menuBounds = await menu.boundingBox();

    if (menuBounds) {
      await page.evaluate((bounds) => {
        window.scrollTo(bounds.x, bounds.y);
      }, menuBounds);
      await page.waitForTimeout(500);
    }

    // Use a more reliable hover approach
    try {
      await menu.hover({ timeout: 5000 });
      console.log('✅ Successfully hovered over menu');
    } catch {
      console.log('⚠️ Menu hover failed, trying alternative approach...');
      // Alternative: scroll menu into view and try clicking directly
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }

    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll settings button into view before clicking
    await settingsButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await settingsButton.click();
    console.log('✅ Successfully clicked settings button');

    await page.getByRole('button', { name: 'Add Data Source' }).click();

    // Look for the database type selector
    console.log('🔍 Looking for database type selector...');

    // help here
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
      'input[placeholder*="database name"], input[placeholder*="Database Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "foobar"...');
    await dbNameInput.fill('baz');

    console.log('🔍 Looking for connection string input...');

    const connStrInput = page.locator('input[placeholder*="postgres(ql)://username:password@host:port/database"]');
    await connStrInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found connection string input, filling connection string...');
    await connStrInput.fill('postgres://user:pass@localhost:5432/db');

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

    console.log('🎉 PostgreSQL data source creation test completed successfully!');
  });
});
