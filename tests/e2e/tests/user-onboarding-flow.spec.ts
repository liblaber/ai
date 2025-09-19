import { type ElementHandle, type Page, test } from '@playwright/test';
import { performInitialSetup } from '../helpers/setup';

test.describe('User Onboarding Flow Test', () => {
  test('Complete user onboarding flow', async ({ page }: { page: Page }) => {
    test.setTimeout(180000);
    await performInitialSetup(page);

    console.log('Starting user onboarding flow test...');

    // Find the homepage textarea using data-testid
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

    const developmentEnvironmentSelector = sampleDataSourceSelector
      .locator('..')
      .locator('..')
      .locator('..')
      .getByText('Development')
      .first();
    await developmentEnvironmentSelector.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Found development environment select option.');
    await developmentEnvironmentSelector.click();

    // Input the message and submit
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
    await iframe.waitFor({ state: 'visible', timeout: 120000 });
    console.log('✅ Iframe found, waiting for it to load...');

    console.log('✅ Iframe visible, waiting for content...');

    try {
      // Check for "Hello World!" content inside the iframe
      console.log(' Looking for "Hello World!" content in iframe...');

      const frame = await iframe
        .elementHandle()
        .then((handle: ElementHandle<SVGElement | HTMLElement> | null) => handle?.contentFrame());

      if (!frame) {
        throw new Error('Could not get frame from iframe element');
      }

      const helloWorldHeading = frame.locator('h1:has-text("Hello World!")');
      await helloWorldHeading.waitFor({ state: 'visible', timeout: 30000 });

      console.log('✅ Found "Hello World!" heading in iframe!');
    } catch (error) {
      console.error('❌ Could not find "Hello World!" heading in iframe', error);
      throw new Error(`Could not find "Hello World!" heading in iframe: ${error}`);
    }

    console.log('🎉 Test completed successfully!');
  });
});
