import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Billing', () => {
  test('billing page is accessible from sidebar', async ({ page }) => {
    await page.goto('/owner');
    await page.getByRole('link', { name: 'Billing' }).first().click();
    await expect(page).toHaveURL('/owner/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  });

  test('billing page shows month navigation', async ({ page }) => {
    await page.goto('/owner/billing');
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  });

  test('billing page loads without error', async ({ page }) => {
    await page.goto('/owner/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal server error');
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('previous month navigation works', async ({ page }) => {
    await page.goto('/owner/billing');
    const monthLabel = page.locator('span.font-medium.text-foreground.min-w-\\[100px\\]');
    const currentMonth = await monthLabel.textContent();
    await page.getByRole('button', { name: 'Previous month' }).click();
    const prevMonth = await monthLabel.textContent();
    expect(currentMonth).not.toBe(prevMonth);
  });
});
