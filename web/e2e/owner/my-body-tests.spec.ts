import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: My Body Tests', () => {
  test('shows seeded body test weight and body fat', async ({ page }) => {
    await page.goto('/owner/my-body-tests');
    await expect(page.getByText('80kg').first()).toBeVisible();
    await expect(page.getByText('16.0%').first()).toBeVisible();
  });

  test('historical body test from 30 days ago is visible', async ({ page }) => {
    await page.goto('/owner/my-body-tests');
    // Owner has two seeded tests (today: 80kg, 30 days ago: 82kg). Both are visible
    // as test cards in the grid.
    await expect(page.getByText('82kg').first()).toBeVisible();
    await expect(page.getByText('17.5%').first()).toBeVisible();
  });
});
