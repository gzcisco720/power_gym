import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Plan Templates', () => {
  test('template list shows E2E Test Plan', async ({ page }) => {
    await page.goto('/trainer/plans');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('edit existing template and verify updated name', async ({ page }) => {
    await page.goto('/trainer/plans');
    const card = page.getByText('E2E Edit Plan', { exact: true }).locator('..').locator('..');
    await card.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/trainer\/plans\/.*\/edit/);

    await page.fill('#plan-name', 'E2E Edit Plan Updated');
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForURL('/trainer/plans');

    await expect(page.getByText('E2E Edit Plan Updated')).toBeVisible();
  });

  test('create new template and verify it appears in list', async ({ page }) => {
    await page.goto('/trainer/plans/new');

    await page.fill('#plan-name', 'Playwright New Plan');
    await page.getByRole('button', { name: '+ Add Day' }).click();
    await page.locator('input[placeholder="Day 1"]').fill('Leg Day');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/trainer/plans');

    await expect(page.getByText('Playwright New Plan')).toBeVisible();
  });
});
