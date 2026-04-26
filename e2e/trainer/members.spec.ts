import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Members', () => {
  test('member list shows member email', async ({ page }) => {
    await page.goto('/trainer/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('click Plan link navigates to plan assignment page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'Plan →' }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    await expect(page.getByText('Assign Plan')).toBeVisible();
  });

  test('assign plan to member', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'Plan →' }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);

    await page.selectOption('select', { label: 'E2E Test Plan' });
    await page.getByRole('button', { name: 'Assign' }).click();

    await expect(page.getByRole('paragraph').filter({ hasText: 'E2E Test Plan' })).toBeVisible();
  });
});
