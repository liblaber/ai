import { test as setup } from '@playwright/test';

setup('perform initial setup', async ({ page }) => {
  await page.goto('/');

  // Handle initial telemetry consent
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

    const successIndication = page.locator('button:has-text("Data Source Connected")');
    await successIndication.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✅ Connected to sample database, waiting for redirect...');
  } catch {
    console.warn('ℹ️ No data source connection page found, continuing...');
  }
});
