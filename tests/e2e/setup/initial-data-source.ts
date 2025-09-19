import { test as setup } from '@playwright/test';

setup('perform initial data source setup', async ({ page }) => {
  await page.goto('/');

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
});
