import { test, expect } from '@playwright/test';

test('shows the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'FinTech' })).toBeVisible();
});

test('signs in and navigates account pages', async ({ page }) => {
  await page.route('**/api/wallet/user/1', (route) =>
    route.fulfill({ json: { wallets: [] } })
  );

  await page.goto('/login');
  await page.locator('input[type="email"]').fill('demo@fintech.com');
  await page.locator('input[type="password"]').fill('demo123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  for (const [linkName, headingName] of [
    ['Wallets', 'My Wallets'],
    ['Transfer', 'Transfer Money'],
    ['Transactions', 'Transaction History'],
    ['Profile', 'Profile'],
  ]) {
    await page.getByRole('link', { name: linkName }).click();
    await expect(page.getByRole('heading', { name: headingName })).toBeVisible();
  }
});
