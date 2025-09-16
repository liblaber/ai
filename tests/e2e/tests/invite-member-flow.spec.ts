import { type ConsoleMessage, expect, type Page, test } from '@playwright/test';

const TEST_MEMBER = 'test@example.com';

test.describe('Invite Member Flow', () => {
  test(`invite ${TEST_MEMBER} member`, async ({ page }: { page: Page }) => {
    test.setTimeout(120000);

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting invite member test...');

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

    // Select Members tab in Settings
    console.log('🔍 Navigating to Members tab...');
    await page.getByText('Members').click();

    // Click Invite Member button
    await page.getByRole('button', { name: 'Add member' }).click();
    console.log('✅ Clicked Add member button');

    // Fill in email
    const emailInput = page.getByTestId('invite-email-input');
    await emailInput.click();
    await emailInput.fill(TEST_MEMBER);
    await emailInput.press('Enter');
    console.log(`✅ Filled in email: ${TEST_MEMBER}`);

    // Select role as Admin
    const roleSelect = page.getByTestId('role-select');
    await roleSelect.selectOption({ label: 'Admin' });

    // Click Create Member button
    const createMemberButton = page.getByTestId('create-member-button');
    await createMemberButton.click();
    console.log('✅ Clicked Create member button');

    console.log('💾 Waiting for create member to complete...');
    await page.waitForLoadState('networkidle');

    // Verify success toast
    const toast = page.getByText(/invitation(s)? sent successfully/i);
    await expect(toast).toBeVisible();
    await expect(toast).toHaveText('1 invitation sent successfully');

    console.log('🎉 Invite member test completed successfully!');
  });
});
