import { type ConsoleMessage, type Page } from '@playwright/test';

export async function performInitialSetup(page: Page) {
  // Enable browser console logging for debugging
  page.on('console', (msg: ConsoleMessage) => console.log('🖥️ Browser console:', msg.text()));
  page.on('pageerror', (error: Error) => console.log('🖥️ Browser error:', error.message));

  await page.goto('/');
}
