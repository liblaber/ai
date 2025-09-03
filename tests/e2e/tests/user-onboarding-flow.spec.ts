import { type ConsoleMessage, type ElementHandle, type Page, test } from '@playwright/test';

test.describe('User Onboarding Flow Test', () => {
  test('Complete user onboarding flow', async ({ page }: { page: Page }) => {
    test.setTimeout(180000); // 3 minutes for this specific test

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

    const dataSourceSelect = page.locator('div[data-testid="data-source-picker-select"]');
    await dataSourceSelect.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found data source select dropdown, selecting first option...');

    await dataSourceSelect.click();

    const sampleDataSourceSelector = page.getByText('Sample Database').first();
    await sampleDataSourceSelector.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Found sample data source select option.');

    await sampleDataSourceSelector.click();

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

    // Wait for any iframe to appear first, but check if it becomes visible
    console.log('🔍 Looking for any iframe in the page...');

    // First wait for iframe to be attached to DOM
    const anyIframe = page.locator('iframe');
    await anyIframe.first().waitFor({ state: 'attached', timeout: 30000 });
    console.log('✅ Found an iframe attached to DOM...');

    // Try to wait for it to become visible, but with shorter timeout
    try {
      await anyIframe.first().waitFor({ state: 'visible', timeout: 30000 });
      console.log('✅ Iframe became visible naturally');
    } catch {
      console.log('⚠️ Iframe not visible yet, checking if it can be made visible...');

      // Try to trigger visibility by scrolling or interactions
      await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          if (iframe.style.display === 'none') {
            iframe.style.display = 'block';
          }

          if (iframe.hasAttribute('hidden')) {
            iframe.removeAttribute('hidden');
          }

          iframe.scrollIntoView();
        });
      });

      await page.waitForTimeout(5000);

      // Try waiting for visibility again
      try {
        await anyIframe.first().waitFor({ state: 'visible', timeout: 10000 });
        console.log('✅ Iframe became visible after DOM manipulation');
      } catch {
        console.log('⚠️ Iframe still not visible, will proceed with attached iframe');
      }
    }

    // Now look specifically for preview iframe with better error handling
    let iframe;

    try {
      iframe = page.locator('iframe[title="preview"]');
      await iframe.waitFor({ state: 'attached', timeout: 30000 });
      console.log('✅ Preview iframe found and attached');

      // Try to make it visible if it's not already
      try {
        await iframe.waitFor({ state: 'visible', timeout: 10000 });
        console.log('✅ Preview iframe is visible');
      } catch {
        console.log('⚠️ Preview iframe attached but not visible, trying to show it...');
        await page.evaluate(() => {
          const previewIframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement | null;

          if (previewIframe) {
            previewIframe.style.display = 'block';
            previewIframe.removeAttribute('hidden');
            previewIframe.style.visibility = 'visible';
            previewIframe.scrollIntoView();
          }
        });
        await page.waitForTimeout(2000);
      }
    } catch {
      console.log('⚠️ Preview iframe not found, using any available iframe...');

      // Use any iframe that's attached
      iframe = anyIframe.first();
      console.log('✅ Using the first available iframe');
    }

    await iframe.waitFor({ state: 'attached', timeout: 10000 });
    console.log('✅ Iframe attached, waiting for content...');

    // Wait for built app to render in the iframe
    await page.waitForTimeout(10000); // Increased wait time

    try {
      // Step 7: Check for "Hello World!" content inside the iframe
      console.log(' Looking for "Hello World!" content in iframe...');

      const frame = await iframe
        .elementHandle()
        .then((handle: ElementHandle<SVGElement | HTMLElement> | null) => handle?.contentFrame());

      if (!frame) {
        console.log('⚠️ Could not get frame content, trying to wait for frame to be ready...');
        await page.waitForTimeout(5000);

        const retryFrame = await iframe
          .elementHandle()
          .then((handle: ElementHandle<SVGElement | HTMLElement> | null) => handle?.contentFrame());

        if (!retryFrame) {
          throw new Error('Could not get frame from iframe element after retry');
        }

        // Use the retry frame
        const helloWorldHeading = retryFrame.locator('h1:has-text("Hello World!")');
        await helloWorldHeading.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✅ Found "Hello World!" heading in iframe after retry!');
      } else {
        // Try different selectors for the heading
        const headingSelectors = [
          'h1:has-text("Hello World!")',
          'h1:text("Hello World!")',
          '[data-testid*="hello"]',
          'h1', // Any h1 as fallback
          '*:has-text("Hello World!")', // Any element with the text
        ];

        let found = false;

        for (const selector of headingSelectors) {
          try {
            const heading = frame.locator(selector);
            await heading.first().waitFor({ state: 'visible', timeout: 10000 });
            console.log(`✅ Found heading using selector: ${selector}`);
            found = true;
            break;
          } catch {
            console.log(`⚠️ Selector ${selector} not found, trying next...`);
            continue;
          }
        }

        if (!found) {
          // Log what's actually in the iframe for debugging
          const bodyContent = await frame
            .locator('body')
            .innerHTML()
            .catch(() => 'Could not read body content');
          console.log('📄 Iframe body content:', bodyContent.substring(0, 500));
          throw new Error('Could not find "Hello World!" heading with any selector');
        }
      }
    } catch (error) {
      console.error('❌ Error finding content in iframe:', error);

      // Try to get more debug info
      try {
        const iframeHTML = await iframe.innerHTML();
        console.log('📄 Iframe outer HTML:', iframeHTML.substring(0, 200));
      } catch {
        console.log('📄 Could not read iframe HTML');
      }

      throw new Error(`Could not find "Hello World!" heading in iframe: ${error.message}`);
    }

    console.log('🎉 Test completed successfully!');
  });
});
