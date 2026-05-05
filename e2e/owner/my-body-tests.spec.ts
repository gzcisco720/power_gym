import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: My Body Tests', () => {
  test('shows seeded body test weight and body fat', async ({ page }) => {
    await page.goto('/owner/my-body-tests');
    await expect(page.getByText('80 kg').first()).toBeVisible();
    await expect(page.getByText('16.0%').first()).toBeVisible();
  });

  test('History section is visible', async ({ page }) => {
    await page.goto('/owner/my-body-tests');
    await expect(page.getByText('History')).toBeVisible();
  });
});
