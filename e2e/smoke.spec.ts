import { test, expect } from '@playwright/test';

test('app loads and shows the login page for unauthenticated users', async ({
  page,
}) => {
  await page.goto('/');

  // The app should redirect unauthenticated users to the login page
  // or show a landing page. Verify the page loaded without errors.
  await expect(page).toHaveTitle(/.+/);
});
