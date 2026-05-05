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

    await page.getByPlaceholder('Search equipment type…').fill('E2E Treadmill');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Equipment' }).click();

    await expect(page.getByText('E2E Treadmill', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('delete equipment removes it from list', async ({ page }) => {
    await page.goto('/owner/equipment');

    // 3x ".." to traverse: text → wrapper div → flex-row → grid row
    const row = page.getByText('E2E Delete Equipment', { exact: true }).locator('..').locator('..').locator('..');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('E2E Delete Equipment', { exact: true })).not.toBeVisible();
  });

  test('status badge shows for tracked equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Track Machine', { exact: true })).toBeVisible();
    await expect(page.getByText('maintenance', { exact: true })).toBeVisible();
  });

  test('condition dialog opens with correct equipment name', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Condition' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Condition — E2E Track Machine')).toBeVisible();
  });

  test('can update equipment status to active via condition dialog', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Condition' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').locator('select').selectOption('active');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('dialog').getByText('active')).toBeVisible({ timeout: 5000 });
  });

  test('can add a condition report', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Condition' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: '+ Add Report' }).click();
    await page.getByPlaceholder('Describe the condition, issue, or action taken…').fill('Lubricated the belt');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Lubricated the belt')).toBeVisible({ timeout: 5000 });
  });
});
