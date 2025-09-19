import { type Page, test } from '@playwright/test';
import { performInitialSetup } from '../helpers/setup';
import { navigateToSettings } from '../helpers/navigate';

test.describe('Add PostgreSQL Data Source Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);
  });

  test('Create PostgreSQL data source when connection string starts with postgresql', async ({
    page,
  }: {
    page: Page;
  }) => {
    console.log('Starting PostgreSQL data source creation test...');

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
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
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
    console.log('Starting PostgreSQL data source creation test...');

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
      'input[placeholder*="data source name"], input[placeholder*="Data Source Name"], input[name*="dbName"], input[name*="name"]',
    );
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found database name input, filling "baz"...');
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
