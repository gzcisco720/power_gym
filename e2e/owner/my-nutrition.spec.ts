import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: My Nutrition', () => {
  test('shows empty state when no nutrition plan is assigned', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await expect(page.getByText('No nutrition plan assigned')).toBeVisible();
  });
});
