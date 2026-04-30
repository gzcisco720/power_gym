import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Settings', () => {
  test('save phone and gym name — values persist after reload', async ({ page }) => {
    await page.goto('/owner/settings');

    await page.fill('#phone', '0400000003');
    await page.fill('#gymName', 'E2E Gym');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000003');
    await expect(page.locator('#gymName')).toHaveValue('E2E Gym');
  });
});
