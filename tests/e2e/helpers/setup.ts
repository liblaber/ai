import { type ConsoleMessage, type Page } from '@playwright/test';
import { loginInitialUser } from './login';

export async function performInitialSetup(page: Page) {
  // Enable browser console logging for debugging
  page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
  page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

  await loginInitialUser(page);

  // Handle initial data source connection
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
}

export async function navigateToSettings(page: Page) {
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
}

export async function navigateToDataSourceForm(page: Page, dataSourceType: string) {
  await page.getByRole('button', { name: 'Add Data Source' }).click();

  // Look for the database type selector
  console.log('🔍 Looking for database type selector...');

  const dbTypeSelector = page.locator('select, [data-testid="add-data-source-select"]');
  await dbTypeSelector.waitFor({ state: 'visible', timeout: 10000 });
  console.log(`✅ Found database type selector, selecting ${dataSourceType}...`);

  // Click to open the dropdown and select the specified data source type
  await dbTypeSelector.click();

  await page.waitForLoadState('domcontentloaded');

  const dataSourceOption = page.locator(`[id="${dataSourceType}"]`);
  await dataSourceOption.waitFor({ state: 'visible', timeout: 5000 });
  await dataSourceOption.click();
  console.log(`✅ Selected ${dataSourceType} database type`);
}
