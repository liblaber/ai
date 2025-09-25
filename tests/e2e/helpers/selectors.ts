import { Page } from '@playwright/test';

/**
 * Common selectors used across multiple test files
 */
export const getDataSourceNameInput = (page: Page) => {
  return page.locator('[data-testid="data-source-name-input"]');
};

export const getAccessTokenInput = (page: Page) => {
  return page.locator('[data-testid="data-source-token-input"]');
};

export const getGoogleSheetsUrlInput = (page: Page) => {
  return page.locator('[data-testid="google-sheets-url-input"]');
};

export const getCreateButton = (page: Page) => {
  return page.locator('[data-testid="create-datasource-button"]');
};

export const getTestConnectionButton = (page: Page) => {
  return page.locator('[data-testid="test-connection-button"]');
};
