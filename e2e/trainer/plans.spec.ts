import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Plan Templates', () => {
  test('template list shows E2E Test Plan', async ({ page }) => {
    await page.goto('/dashboard/trainer/plans');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('create new template and verify it appears in list', async ({ page }) => {
    await page.goto('/dashboard/trainer/plans/new');

    await page.fill('#plan-name', 'Playwright New Plan');
    await page.getByRole('button', { name: '+ Add Day' }).click();
    await page.locator('input[placeholder="Day 1"]').fill('Leg Day');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/dashboard/trainer/plans');

    await expect(page.getByText('Playwright New Plan')).toBeVisible();
  });
});
