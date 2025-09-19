import { type Page } from '@playwright/test';

export async function loginInitialUser(page: Page) {
  // Navigate to the app
  await page.goto('/');
  await page.waitForLoadState('networkidle');

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

  await page.goto('/');
}
