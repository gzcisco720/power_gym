import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

const TODAY = new Date().toISOString().slice(0, 10);

test.describe('Owner My Nutrition landing', () => {
  test('landing page renders with From Template and Freestyle cards', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await expect(page.getByRole('heading', { name: 'My Nutrition' })).toBeVisible();
    // Card labels are uppercased via CSS but DOM text is as-is; use case-insensitive regex
    await expect(page.getByText(/from template/i).first()).toBeVisible();
    await expect(page.getByText(/freestyle/i).first()).toBeVisible();
  });

  test('Freestyle Log Today navigates to /day route', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await page.getByRole('button', { name: /log today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day/);
  });

  test('calendar icon opens calendar popover', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await page.getByRole('button', { name: /open calendar/i }).click();
    // base-ui Popover uses data-slot="popover-positioner"
    await expect(page.locator('[data-slot="popover-positioner"]')).toBeVisible();
  });

  test('day view loads at /day route and shows Mark day complete', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}`);
    await expect(page.getByRole('button', { name: 'Mark day complete' })).toBeVisible({ timeout: 8000 });
  });
});
