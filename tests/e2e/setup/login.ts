import { test as setup, expect } from '@playwright/test';
// Import the constant from your config file
import { STORAGE_STATE } from '../playwright.config';

// Use the imported constant instead of a local variable
const authFile = STORAGE_STATE;

setup('authenticate', async ({ request }) => {
  console.log('🔍 Logging in initial user...');

  // Make the API request to log in.
  const response = await request.post('/api/auth/test/login', {
    data: {
      email: 'test.user@liblab.com',
      name: 'Test User',
      role: 'Admin',
    },
  });

  if (!response.ok()) {
    console.error('❌ Login failed with status:', response.status());
    console.error('Response body:', await response.text());
  } else {
    console.log('✅ Login successful');
  }

  // Check that the API call was successful.
  expect(response.ok(), 'API login failed').toBe(true);

  // Save the storage state (cookies, localStorage, etc.) to the file.
  await request.storageState({ path: authFile });
  console.log('✅ User session saved to', authFile);
});
