import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Billing', () => {
  test('billing page is accessible from sidebar', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: 'My Billing' }).click();
    await expect(page).toHaveURL('/member/billing');
    await expect(page.getByRole('heading', { name: 'My Billing' })).toBeVisible();
  });

  test('billing page shows month navigation', async ({ page }) => {
    await page.goto('/member/billing');
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  });

  test('billing page loads without error', async ({ page }) => {
    await page.goto('/member/billing');
    await expect(page.getByRole('heading', { name: 'My Billing' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal server error');
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('member cannot access owner billing page', async ({ page }) => {
    await page.goto('/owner/billing');
    await page.waitForURL((url) => !url.pathname.startsWith('/owner'));
    await expect(page).not.toHaveURL('/owner/billing');
  });
});
