import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Billing', () => {
  test('billing page is accessible from sidebar', async ({ page }) => {
    await page.goto('/trainer');
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL('/trainer/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  });

  test('billing page shows month navigation', async ({ page }) => {
    await page.goto('/trainer/billing');
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  });

  test('billing page loads without error', async ({ page }) => {
    await page.goto('/trainer/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal server error');
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('trainer cannot access owner services page', async ({ page }) => {
    await page.goto('/owner/services');
    await expect(page).not.toHaveURL('/owner/services');
  });
});
