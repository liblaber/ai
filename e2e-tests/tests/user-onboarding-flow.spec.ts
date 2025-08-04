import { test } from '@playwright/test';

test.describe('User Onboarding Flow Test', () => {
  test('Complete user onboarding flow', async ({ page }) => {
    // Enable console logging to see what's happening
    page.on('console', (msg) => console.log('Browser console:', msg.text()));
    page.on('pageerror', (error) => console.log('Browser error:', error.message));

    console.log('🚀 Starting user flow test...');

    // Step 1: Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/step1-homepage.png' });

    // Step 2: Handle telemetry consent page
    console.log('🔍 Checking for telemetry consent page...');

    const telemetryHeading = page.locator('h1:has-text("Help us improve liblab ai")');

    // Wait for telemetry heading to appear (with timeout)
    try {
      await telemetryHeading.waitFor({ state: 'visible', timeout: 5000 });
      console.log('📋 Found telemetry consent page, clicking Decline...');

      // Click the Decline button - using the specific button text from the component
      const declineButton = page.locator('button:has-text("Decline")');
      await declineButton.waitFor({ state: 'visible' });
      await declineButton.click();

      // Wait for the page to redirect
      await page.waitForLoadState('networkidle');
      console.log('✅ Declined telemetry, waiting for redirect...');

      // Take a screenshot after declining
      await page.screenshot({ path: 'test-results/step2-after-decline.png' });
    } catch {
      console.log('ℹ️ No telemetry consent page found, continuing...');
    }

    // Step 3: Handle data source connection page
    console.log('🔍 Checking for data source connection page...');

    const dataSourceHeading = page.locator('h1:has-text("Let\'s connect your data source")');

    // Wait for data source heading to appear (with timeout)
    try {
      await dataSourceHeading.waitFor({ state: 'visible', timeout: 5000 });
      console.log('💾 Found data source connection page, connecting to sample database...');

      // Wait a moment for the page to fully load
      await page.waitForTimeout(1000);

      // Look for the "Connect" button for sample database
      const connectButton = page.locator('button:has-text("Connect")');

      // Wait for the button to be visible and clickable
      await connectButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔗 Found Connect button, clicking...');
      await connectButton.click();

      // Wait for the connection to complete and redirect
      await page.waitForLoadState('networkidle');

      // Wait a bit more for any success animations
      await page.waitForTimeout(3000);
      console.log('✅ Connected to sample database, waiting for redirect...');

      // Take a screenshot after connecting
      await page.screenshot({ path: 'test-results/step3-after-connect.png' });
    } catch {
      console.log('ℹ️ No data source connection page found, continuing...');
    }

    // Step 4: Verify we're on the home page and find the textarea
    console.log('🔍 Looking for homepage textarea...');

    // Wait a moment for the page to settle
    await page.waitForTimeout(2000);

    // Try different possible selectors for the textarea
    const textareaSelectors = [
      'textarea[placeholder*="chat"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="What"]',
      'textarea',
      '[data-testid="homepage-textarea"]',
      '.HomepageTextarea textarea',
      '[role="textbox"]',
    ];

    let textarea = null;

    for (const selector of textareaSelectors) {
      const element = page.locator(selector);

      if (await element.isVisible()) {
        textarea = element;
        console.log(`✅ Found textarea with selector: ${selector}`);
        break;
      }
    }

    if (!textarea) {
      console.log('❌ Could not find textarea, taking screenshot for debugging...');
      await page.screenshot({ path: 'test-results/step4-no-textarea.png', fullPage: true });

      // Log all textareas on the page for debugging
      const allTextareas = await page.locator('textarea').all();
      console.log(`Found ${allTextareas.length} textarea elements on the page`);

      throw new Error('Could not find the homepage textarea');
    }

    // Take a screenshot before filling the textarea
    await page.screenshot({ path: 'test-results/step4-before-input.png' });

    // Step 5: Input the message and submit
    console.log('✍️ Filling textarea with message...');
    await textarea.fill('Build a revenue dashboard');

    // Wait a moment for the input to be processed
    await page.waitForTimeout(500);

    // Try to find and click the send button
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      'button[aria-label*="send"]',
      'button[aria-label*="submit"]',
      '[data-testid="send-button"]',
      'button:has-text("→")',
      'button:has-text("Send message")',
    ];

    let sendButton = null;

    for (const selector of sendButtonSelectors) {
      const element = page.locator(selector);

      if (await element.isVisible()) {
        sendButton = element;
        console.log(`✅ Found send button with selector: ${selector}`);
        break;
      }
    }

    if (sendButton) {
      console.log('🖱️ Clicking send button...');
      await sendButton.click();
    } else {
      console.log('⌨️ No send button found, pressing Enter...');

      // If no send button, try pressing Enter
      await textarea.press('Enter');
    }

    // Wait for the action to complete
    await page.waitForLoadState('networkidle');
    console.log('📤 Message submitted, waiting for response...');

    // Take a screenshot after submission
    await page.screenshot({ path: 'test-results/step5-after-submit.png' });

    // Wait a bit more to see the result
    await page.waitForTimeout(3000);
    console.log('🎉 Test completed successfully!');

    // Final screenshot
    await page.screenshot({ path: 'test-results/step6-final.png' });
  });
});
