import { Page } from '@playwright/test';

/**
 * Common selectors used across multiple test files
 */
export const getDataSourceNameInput = (page: Page) => {
  return page
    .locator('[data-testid="data-source-name-input"]')
    .or(page.getByRole('textbox', { name: /data source name/i }))
    .or(page.locator('input[placeholder*="data source name"], input[placeholder*="Data Source Name"]'));
};

export const getHubSpotTokenInput = (page: Page) => {
  return page
    .locator('[data-testid="hubspot-token-input"]')
    .or(page.getByRole('textbox', { name: /access token|api token|hubspot token/i }))
    .or(page.locator('input[placeholder*="pat-"], input[placeholder*="access token"], input[placeholder*="token"]'));
};

export const getGoogleSheetsUrlInput = (page: Page) => {
  return page
    .locator('[data-testid="google-sheets-url-input"]')
    .or(page.getByRole('textbox', { name: /spreadsheet url|google sheets url|url/i }))
    .or(
      page.locator(
        'input[placeholder*="docs.google.com"], input[placeholder*="spreadsheet"], input[placeholder*="https://"]',
      ),
    );
};

export const getCreateButton = (page: Page) => {
  return page.getByRole('button', { name: /create|save|add data source/i });
};

export const getTestConnectionButton = (page: Page) => {
  return page.getByRole('button', { name: /test connection|validate token|test api/i });
};
