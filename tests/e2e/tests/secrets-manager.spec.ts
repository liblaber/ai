import { expect, test } from '@playwright/test';
import { navigateToSettings, performInitialSetup } from '../helpers/setup';

test.describe.serial('Secrets Manager Tests', () => {
  const environmentVariableName = 'SECRET_KEY';
  const environmentVariableValue = 'SECRET_VALUE';
  const environmentVariableNameDescription = 'Description';

  const updatedEnvironmentVariableName = 'SECRET_KEY_UPDATED';
  const updatedEnvironmentVariableValue = 'SECRET_VALUE_UPDATED';
  const updatedEnvironmentVariableNameDescription = 'Description Updated';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);

    const secretManagerTab = page.locator('[data-testid="settings-tab-secrets-manager"]');
    await secretManagerTab.waitFor({ state: 'visible', timeout: 10000 });
    await secretManagerTab.click();
  });

  test('Create Environment Variable', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Secret' }).click();
    await page.getByLabel('Environment *').selectOption({ index: 0 });
    await page.getByRole('textbox', { name: 'Key *' }).fill(environmentVariableName);
    await page.getByRole('textbox', { name: 'Value *' }).fill(environmentVariableValue);
    await page.getByRole('textbox', { name: 'Description' }).fill(environmentVariableNameDescription);
    await page.getByRole('button', { name: 'Create Secret' }).click();

    const secretElement = page.getByText(environmentVariableName);
    await secretElement.waitFor({ state: 'visible', timeout: 1000 });
    await secretElement.click();

    await expect(page.getByRole('textbox', { name: 'Key *' })).toHaveValue(environmentVariableName);
    await expect(page.getByRole('textbox', { name: 'Value *' })).toHaveValue(environmentVariableValue);
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue(environmentVariableNameDescription);
  });

  test('Update Environment Variable', async ({ page }) => {
    const secretElement = page.getByText(environmentVariableName);
    await secretElement.click();

    await page.getByRole('textbox', { name: 'Key *' }).fill(updatedEnvironmentVariableName);
    await page.getByRole('textbox', { name: 'Value *' }).fill(updatedEnvironmentVariableValue);
    await page.getByRole('textbox', { name: 'Description' }).fill(updatedEnvironmentVariableNameDescription);

    await page.getByRole('button', { name: 'Update Secret' }).click();

    const updatedSecretElement = page.getByText(updatedEnvironmentVariableName);
    await updatedSecretElement.waitFor({ state: 'visible', timeout: 10000 });
    await updatedSecretElement.click();

    await expect(page.getByRole('textbox', { name: 'Key *' })).toHaveValue(updatedEnvironmentVariableName);
    await expect(page.getByRole('textbox', { name: 'Value *' })).toHaveValue(updatedEnvironmentVariableValue);
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue(
      updatedEnvironmentVariableNameDescription,
    );
  });

  test('Delete Environment Variable', async ({ page }) => {
    const secretElement = page.getByText(updatedEnvironmentVariableName);
    await secretElement.click();

    await page.getByRole('button', { name: 'Delete Secret' }).click();

    const confirmationElement = page.getByText(
      `Are you sure you want to delete the secret "${updatedEnvironmentVariableName}"? This action cannot be undone.`,
    );
    await confirmationElement.waitFor({ state: 'visible', timeout: 10000 });

    await page.getByRole('button', { name: 'Delete Secret' }).click();

    const deletedSecretElement = page.getByText(updatedEnvironmentVariableName);
    await expect(deletedSecretElement).not.toBeVisible();
  });
});
