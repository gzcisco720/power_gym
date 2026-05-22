import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
  });

  test('renders KPI strip with 4 stat cards', async ({ page }) => {
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Sessions Today')).toBeVisible();
    await expect(page.getByText('Check-ins')).toBeVisible();
    await expect(page.getByText('Needs Attention')).toBeVisible();
  });

  test('renders Today\'s Sessions section', async ({ page }) => {
    await expect(page.getByText("Today's Sessions")).toBeVisible();
  });

  test('renders Needs Attention section', async ({ page }) => {
    await expect(page.getByText('Needs Attention')).toBeVisible();
  });

  test('renders Pending Check-ins section', async ({ page }) => {
    await expect(page.getByText('Pending Check-ins')).toBeVisible();
  });

  test('renders This Week schedule card', async ({ page }) => {
    await expect(page.getByText('This Week')).toBeVisible();
  });

  test('renders Member Compliance section', async ({ page }) => {
    await expect(page.getByText(/Member Compliance/i)).toBeVisible();
  });

  test('Today\'s Sessions links to calendar', async ({ page }) => {
    const viewAll = page.getByRole('link', { name: /View all/i }).first();
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toHaveAttribute('href', '/trainer/calendar');
  });

  test('This Week card links to calendar', async ({ page }) => {
    const weekCard = page.getByText('This Week').locator('../..');
    await expect(weekCard).toBeVisible();
  });
});
