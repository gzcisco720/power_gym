import { test, expect } from '@playwright/test';

test.describe('Owner Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
    await page.goto('/owner/equipment');
    await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible({ timeout: 10000 });
  });

  test('owner adds equipment via dialog — appears in list', async ({ page }) => {
    // Click + Add Equipment
    await page.getByRole('button', { name: /add equipment/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const eqName = `E2E Barbell ${Date.now()}`;

    // Fill in name
    await page.getByLabel('Name').fill(eqName);

    // Submit
    await page.getByRole('button', { name: /add equipment/i }).last().click();

    // Dialog closes and item appears in list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(eqName)).toBeVisible({ timeout: 10000 });
  });

  test('owner opens item, adds a condition report — report shows in history', async ({ page }) => {
    // First add an equipment item with trackCondition=true via the API/dialog
    await page.getByRole('button', { name: /add equipment/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const eqName = `E2E Tracked ${Date.now()}`;
    await page.getByLabel('Name').fill(eqName);

    // Enable track condition
    await page.getByRole('switch', { name: /track condition/i }).click();

    // Submit
    await page.getByRole('button', { name: /add equipment/i }).last().click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(eqName)).toBeVisible({ timeout: 10000 });

    // Open the item via Edit button
    const row = page.locator('div').filter({ hasText: eqName }).last();
    await row.getByRole('button', { name: /^edit$/i }).click();

    // Edit dialog opens
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Switch to Condition tab
    await page.getByRole('button', { name: 'Condition' }).click();

    // Add a report
    await page.getByRole('button', { name: /add report/i }).click();
    const reportNote = `Test condition report ${Date.now()}`;
    await page.getByRole('textbox', { name: /report note/i }).fill(reportNote);
    await page.getByRole('button', { name: /^save$/i }).click();

    // Report should appear
    await expect(page.getByText(reportNote)).toBeVisible({ timeout: 10000 });
  });
});
