import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Settings', () => {
  test('save phone and bio — values persist after reload', async ({ page }) => {
    await page.goto('/trainer/settings');

    await page.fill('#phone', '0400000001');
    await page.fill('#bio', 'E2E trainer bio');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000001');
    await expect(page.locator('#bio')).toHaveValue('E2E trainer bio');
  });
});
