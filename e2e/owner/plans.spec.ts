import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Plan Templates', () => {
  test('template list shows E2E Owner Plan', async ({ page }) => {
    await page.goto('/owner/plans');
    await expect(page.getByText('E2E Owner Plan')).toBeVisible();
  });

  test('edit existing template and verify updated name', async ({ page }) => {
    await page.goto('/owner/plans');
    const card = page.getByText('E2E Owner Edit Plan', { exact: true }).locator('..').locator('..');
    await card.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/owner\/plans\/.*\/edit/);

    await page.fill('#plan-name', 'E2E Owner Edit Plan Updated');
    await page.getByRole('button', { name: 'Save Plan' }).click();
    await page.waitForURL('/owner/plans');

    await expect(page.getByText('E2E Owner Edit Plan Updated')).toBeVisible();
  });

  test('create new template and verify it appears in list', async ({ page }) => {
    await page.goto('/owner/plans/new');

    await page.fill('#plan-name', 'Playwright Owner New Plan');
    await page.getByRole('button', { name: '+ Add Day' }).click();
    await page.locator('input[placeholder="Day 1"]').fill('Chest Day');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/owner/plans');

    await expect(page.getByText('Playwright Owner New Plan')).toBeVisible();
  });
});
