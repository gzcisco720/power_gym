import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Members', () => {
  test('member list shows member email and trainer name', async ({ page }) => {
    await page.goto('/owner/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
    await expect(page.getByText('Test Trainer').first()).toBeVisible();
  });

  test('reassign member to a different trainer', async ({ page }) => {
    await page.goto('/owner/members');
    const memberRow = page.getByText('reassign-member@test.com', { exact: true }).locator('..').locator('..');
    await memberRow.getByRole('button', { name: /reassign/i }).click();

    await page.selectOption('select', { label: 'Test Trainer 2' });
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByText('Test Trainer 2')).toBeVisible();
  });
});
