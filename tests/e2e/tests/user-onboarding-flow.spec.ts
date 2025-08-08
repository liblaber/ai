import { type ConsoleMessage, type ElementHandle, type Page, test } from '@playwright/test';

test.describe('User Onboarding Flow Test', () => {
  test('Complete user onboarding flow', async ({ page }: { page: Page }) => {
    test.setTimeout(120000); // 2 minutes for this specific test

    // Enable browser console logging for debugging
    page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
    page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

    console.log('Starting user onboarding flow test...');

    // Step 1: Navigate to the application
    console.log('🧭 Navigating to application...');
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Step 2: Handle telemetry consent page
    try {
      console.log('🔍 Checking for telemetry consent page...');

      const telemetryHeading = page.locator('h1:has-text("Help us improve liblab ai")');
      await telemetryHeading.waitFor({ state: 'visible', timeout: 10000 });
      console.log('📋 Found telemetry consent page, clicking Decline...');

      const declineButton = page.locator('button:has-text("Decline")');
      await declineButton.waitFor({ state: 'visible' });
      await declineButton.click();

      await page.waitForLoadState('networkidle');
      console.log('✅ Declined telemetry, waiting for redirect...');
    } catch {
      console.warn('ℹ️ No telemetry consent page found, continuing...');
    }

    // Step 3: Handle data source connection page
    try {
      console.log('🔍 Checking for data source connection page...');

      const dataSourceHeading = page.locator('h1:has-text("Let\'s connect your data source")');
      await dataSourceHeading.waitFor({ state: 'visible', timeout: 10000 });
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

    // Step 4: Find the homepage textarea using data-testid
    console.log('🔍 Looking for homepage textarea...');

    const textarea = page.locator('[data-testid="homepage-textarea"]');
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found homepage textarea');

    // Step 5: Input the message and submit
    console.log('✍️ Filling textarea with message...');
    await textarea.fill('Build hello world application with Hello World! h1 title');

    // Find and click the send button using data-testid
    const sendButton = page.locator('[data-testid="send-message-button"]');
    await sendButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🖱️ Clicking send button...');
    await sendButton.click();

    // Wait for the action to complete
    await page.waitForLoadState('networkidle');
    console.log(' Message submitted, waiting for response...');

    // Step 6: Wait for the chat interface to appear and iframe to load
    console.log('🔍 Waiting for chat interface and iframe to load...');

    const chatInterface = page.locator('[data-chat-visible="true"]');
    await chatInterface.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Chat interface loaded');

    const iframe = page.locator('iframe[title="preview"]');
    await iframe.waitFor({ state: 'visible', timeout: 90000 });
    console.log('✅ Iframe found, waiting for it to load...');

    await iframe.waitFor({ state: 'attached', timeout: 10000 });
    console.log('✅ Iframe attached, waiting for content...');

    // Wait for built app to render in the iframe
    await page.waitForTimeout(5000);

    try {
      // Step 7: Check for "Hello World!" content inside the iframe
      console.log(' Looking for "Hello World!" content in iframe...');

      const frame = await iframe
        .elementHandle()
        .then((handle: ElementHandle<SVGElement | HTMLElement> | null) => handle?.contentFrame());

      if (!frame) {
        throw new Error('Could not get frame from iframe element');
      }

      const helloWorldHeading = frame.locator('h1:has-text("Hello World!")');
      await helloWorldHeading.waitFor({ state: 'visible', timeout: 100000 });

      console.log('✅ Found "Hello World!" heading in iframe!');
    } catch {
      console.error('❌ Could not find "Hello World!" heading in iframe');
      throw new Error('Could not find "Hello World!" heading in iframe');
    }

    console.log('🎉 Test completed successfully!');
  });
});
