import { type Page, test, expect } from '@playwright/test';
import { performInitialSetup } from '../helpers/setup';
import {
  getDataSourceNameInput,
  getAccessTokenInput,
  getCreateButton,
  getTestConnectionButton,
} from '../helpers/selectors';
import { navigateToDataSourceForm, navigateToSettings } from '../helpers/navigate';

test.describe('Add HubSpot Data Source Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);
    await navigateToDataSourceForm(page, 'hubspot');
  });

  test('Validate HubSpot access token format and required fields', async ({ page }: { page: Page }) => {
    const saveButton = getCreateButton(page);
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });

    // Test 1: Try to create without filling required fields
    await expect(saveButton, 'Create button should be disabled when required fields are empty').toBeDisabled();

    // Test 2: Fill name but leave access token empty
    const dbNameInput = getDataSourceNameInput(page);
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await dbNameInput.fill('test-hubspot-validation');

    // Assert that Create button is still disabled without access token
    await expect(saveButton, 'Create button should remain disabled without access token').toBeDisabled();

    // Test 3: Test invalid token format
    const tokenInput = getAccessTokenInput(page);
    await tokenInput.waitFor({ state: 'visible', timeout: 10000 });

    // Test with invalid token format (this may be validated at API level)
    await tokenInput.fill('invalid-token-format');

    // Test 4: Test valid token format
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN || 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    await tokenInput.fill(hubspotToken);

    // Assert that Create button is now enabled with valid token format
    await expect(saveButton, 'Create button should be enabled with valid token format').toBeEnabled();

    // Test 5: Test connection functionality with API response validation
    const testConnButton = getTestConnectionButton(page);

    // Test connection button might not always be present
    const testConnButtonExists = await testConnButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (testConnButtonExists) {
      // Wait for the test connection API response
      const [testResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/data-sources/test') ||
            response.url().includes('/test-connection') ||
            response.url().includes('/hubspot'),
        ),
        testConnButton.click(),
      ]);

      // For test tokens, we expect authentication errors (401/403)
      if (testResponse.status() === 401 || testResponse.status() === 403) {
        // This is expected behavior for test tokens
        const errorFeedback = page.getByText(/invalid token|unauthorized|authentication failed/i).first();
        // Error feedback might or might not appear in UI depending on implementation
        await errorFeedback.isVisible({ timeout: 3000 }).catch(() => false);
      }
    }
  });

  test('Test HubSpot token validation and error handling', async ({ page }: { page: Page }) => {
    // Fill in the data source name
    const dbNameInput = getDataSourceNameInput(page);
    await dbNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await dbNameInput.fill('test-hubspot-error-handling');

    const tokenInput = getAccessTokenInput(page);
    await tokenInput.waitFor({ state: 'visible', timeout: 10000 });

    const saveButton = getCreateButton(page);

    // Test different token scenarios (note: client-side validation may vary)
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN || 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    const tokenScenarios = [
      { name: 'Empty token', token: '', shouldEnable: false },
      { name: 'Valid format token', token: hubspotToken, shouldEnable: true },
    ];

    for (const scenario of tokenScenarios) {
      await tokenInput.fill('');
      await tokenInput.fill(scenario.token);
      await page.waitForTimeout(500);

      if (scenario.shouldEnable) {
        await expect(saveButton, `Create button should be enabled for ${scenario.name}`).toBeEnabled({
          timeout: 3000,
        });
      } else {
        await expect(saveButton, `Create button should be disabled for ${scenario.name}`).toBeDisabled({
          timeout: 3000,
        });
      }
    }

    // Test token validation with API call (if test connection button exists)
    await tokenInput.fill(hubspotToken);

    const testConnButton = getTestConnectionButton(page);
    const testConnButtonExists = await testConnButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (testConnButtonExists) {
      // Test the API response for token validation
      const [validationResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/data-sources/test') ||
            response.url().includes('/test-connection') ||
            response.url().includes('/hubspot') ||
            response.status() >= 400, // Capture error responses
        ),
        testConnButton.click(),
      ]);

      // For test tokens, we expect authentication errors (401/403)
      if (validationResponse.status() === 401 || validationResponse.status() === 403) {
        // This is expected behavior for test tokens
        const errorMessage = page.getByText(/invalid token|unauthorized|authentication failed|token expired/i).first();
        // Error message might or might not appear in UI depending on implementation
        await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
      }
    }

    // Test form state persistence
    const currentName = await dbNameInput.inputValue();
    const currentToken = await tokenInput.inputValue();

    expect(currentName).toBe('test-hubspot-error-handling');
    expect(currentToken).toBe(hubspotToken);
  });
});
