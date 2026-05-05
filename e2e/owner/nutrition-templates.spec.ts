import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Nutrition Templates', () => {
  test('template list shows E2E Owner Nutrition', async ({ page }) => {
    await page.goto('/owner/nutrition-templates');
    await expect(page.getByText('E2E Owner Nutrition')).toBeVisible();
  });

  test('edit existing nutrition template and verify updated name', async ({ page }) => {
    await page.goto('/owner/nutrition-templates');
    const card = page.getByText('E2E Owner Edit Nutrition', { exact: true }).locator('..').locator('..');
    await card.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/owner\/nutrition-templates\/.*\/edit/);

    await page.fill('#plan-name', 'E2E Owner Edit Nutrition Updated');
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForURL('/owner/nutrition-templates');

    await expect(page.getByText('E2E Owner Edit Nutrition Updated')).toBeVisible();
  });

  test('create new nutrition template and verify it appears', async ({ page }) => {
    await page.goto('/owner/nutrition-templates/new');

    await page.fill('#plan-name', 'Playwright Owner Nutrition');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.locator('input[placeholder="e.g. Training Day"]').fill('Training Day');
    await page.locator('input[type="number"]').first().fill('2200');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/owner/nutrition-templates');

    await expect(page.getByText('Playwright Owner Nutrition')).toBeVisible();
  });
});
