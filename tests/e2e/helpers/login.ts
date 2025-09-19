import { type Page } from '@playwright/test';

export async function loginInitialUser(page: Page) {
  // Navigate to the app
  await page.goto('/');

  const userLoggedInMenu = page.getByTestId('user-menu-button');

  if (await userLoggedInMenu.isVisible()) {
    console.log('✅ User already logged in, skipping login step');
    return;
  }

  console.log('🔍 Logging in initial user...');

  await page.request.post('/api/auth/test/login', {
    data: {
      email: 'test.user@liblab.com',
      name: 'Test User',
      role: 'Admin',
    },
  });

  // The API call sets the auth cookie. Reload the page to reflect the logged-in state.
  await page.reload();

  // The waits for the menu to be visible ensures that the login process is complete.
  await userLoggedInMenu.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Login successful!');
}
