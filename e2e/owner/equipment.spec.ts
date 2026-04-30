import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Equipment', () => {
  test('list shows seeded equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
  });

  test('create new equipment appears in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();

    await page.fill('#eq-name', 'E2E Treadmill');
    await page.selectOption('#eq-category', 'cardio');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('E2E Treadmill', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('delete equipment removes it from list', async ({ page }) => {
    await page.goto('/owner/equipment');

    const row = page.getByText('E2E Delete Equipment', { exact: true }).locator('..').locator('..');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('E2E Delete Equipment', { exact: true })).not.toBeVisible();
  });
});
