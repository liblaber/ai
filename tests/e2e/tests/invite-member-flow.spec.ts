import { expect, type Page, test } from '@playwright/test';
import { performInitialSetup, navigateToSettings } from '../helpers/setup';

const TEST_MEMBER = 'test@example.com';

test.describe('Invite Member Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await performInitialSetup(page);
    await navigateToSettings(page);
  });

  test(`invite ${TEST_MEMBER} member`, async ({ page }: { page: Page }) => {
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
    await expect(page.getByText('1 invitation sent successfully')).toBeVisible();

    console.log('🎉 Invite member test completed successfully!');
  });
});
