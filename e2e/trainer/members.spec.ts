import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Members', () => {
  test('member list shows member email', async ({ page }) => {
    await page.goto('/trainer/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('clicking member card navigates to hub page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    // Profile header shows member name
    await expect(page.getByText('Test Member').first()).toBeVisible();
    // Tab nav is present (unique to hub)
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub overview shows data cards with seeded data', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    await expect(page.getByText('当前体重')).toBeVisible();
    await expect(page.getByText('体脂率')).toBeVisible();
    await expect(page.getByText('累计训练')).toBeVisible();
    await expect(page.getByText('上次训练')).toBeVisible();
    await expect(page.getByText('当前计划')).toBeVisible();
    // Seeded body test: weight 75kg
    await expect(page.getByText('75')).toBeVisible();
    // Active plan name
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('Plan tab navigates to plan page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    await expect(page.getByText('Assign Plan')).toBeVisible();
  });

  test('assign plan to member via hub', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);

    await page.selectOption('select', { label: 'E2E Test Plan' });
    await page.getByRole('button', { name: 'Assign' }).click();

    await expect(page.getByRole('paragraph').filter({ hasText: 'E2E Test Plan' })).toBeVisible();
  });

  test('Progress tab navigates to progress page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/progress/);
    await expect(page.getByText('Training Frequency')).toBeVisible();
  });
});
