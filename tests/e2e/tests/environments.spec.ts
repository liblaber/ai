import { expect, test } from '@playwright/test';
import { performInitialSetup } from '../helpers/setup';
import { navigateToSettings } from '../helpers/navigate';

test.describe.serial('Environment Management Tests', () => {
  let testEnvironmentId = '';
  const testEnvironmentName = `Test Environment ${Date.now()}`;
  const testEnvironmentDescription = 'This is a test environment for e2e testing';
  const updatedEnvironmentName = `Updated ${testEnvironmentName}`;
  const updatedEnvironmentDescription = 'This is an updated test environment description';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);

    const environmentsTab = page.locator('[data-testid="settings-tab-environments"]');
    await environmentsTab.waitFor({ state: 'visible', timeout: 10000 });
    await environmentsTab.click();
  });

  test('Create Environment', async ({ page }) => {
    const addButton = page.locator('[data-testid="add-environment-button"]');
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    await addButton.click();

    const nameInput = page.locator('[data-testid="environment-name-input"]');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(testEnvironmentName);

    const descriptionInput = page.locator('[data-testid="environment-description-input"]');
    await descriptionInput.waitFor({ state: 'visible' });
    await descriptionInput.fill(testEnvironmentDescription);

    const createButton = page.locator('[data-testid="create-environment-submit"]');
    await createButton.waitFor({ state: 'visible' });
    await createButton.click();

    await page.waitForLoadState('networkidle');

    const environmentItem = page.locator(`text=${testEnvironmentName}`).first();
    await expect(environmentItem).toBeVisible({ timeout: 15000 });

    const environmentContainer = page
      .locator(`[data-testid^="environment-item-"]`)
      .filter({
        hasText: testEnvironmentName,
      })
      .first();
    const environmentDataTestId = (await environmentContainer.getAttribute('data-testid')) || '';
    testEnvironmentId = environmentDataTestId.replace('environment-item-', '');
  });

  test('Update Environment', async ({ page }) => {
    const editButton = page.locator(`[data-testid="edit-environment-${testEnvironmentId}"]`);
    await editButton.waitFor({ state: 'visible', timeout: 10000 });
    await editButton.click();

    const editNameInput = page.locator('[data-testid="edit-environment-name-input"]');
    await editNameInput.waitFor({ state: 'visible' });
    await editNameInput.clear();
    await editNameInput.fill(updatedEnvironmentName);

    const editDescriptionInput = page.locator('[data-testid="edit-environment-description-input"]');
    await editDescriptionInput.waitFor({ state: 'visible' });
    await editDescriptionInput.clear();
    await editDescriptionInput.fill(updatedEnvironmentDescription);

    const updateButton = page.locator('[data-testid="update-environment-submit"]');
    await updateButton.waitFor({ state: 'visible' });
    await updateButton.click();

    await page.waitForLoadState('networkidle');

    const updatedEnvironmentItem = page.locator(`text=${updatedEnvironmentName}`).first();
    await expect(updatedEnvironmentItem).toBeVisible({ timeout: 15000 });
  });

  test('Delete Environment', async ({ page }) => {
    const deleteButton = page.locator(`[data-testid="delete-environment-${testEnvironmentId}"]`);
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteButton.click();

    const confirmDeleteButton = page.locator('[data-testid="confirm-delete-button"]');
    await confirmDeleteButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmDeleteButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const deletedEnvironmentItem = page.locator(`text=${updatedEnvironmentName}`);
    await expect(deletedEnvironmentItem).not.toBeVisible();
  });
});
