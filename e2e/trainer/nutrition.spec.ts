import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Nutrition Templates', () => {
  test('template list shows E2E Nutrition Template', async ({ page }) => {
    await page.goto('/dashboard/trainer/nutrition');
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });

  test('create new nutrition template and verify it appears', async ({ page }) => {
    await page.goto('/dashboard/trainer/nutrition/new');

    await page.fill('#plan-name', 'Playwright Nutrition Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();

    await page.locator('input[placeholder="e.g. Training Day"]').fill('Rest Day');
    await page.locator('input[type="number"]').first().fill('2000');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/dashboard/trainer/nutrition');

    await expect(page.getByText('Playwright Nutrition Plan')).toBeVisible();
  });
});
