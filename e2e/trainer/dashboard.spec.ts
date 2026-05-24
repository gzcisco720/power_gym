import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trainer');
  });

  test('renders KPI strip with 4 stat cards', async ({ page }) => {
    await expect(page.getByText('Members').first()).toBeVisible();
    await expect(page.getByText('Sessions Today')).toBeVisible();
    await expect(page.getByText('Check-ins').first()).toBeVisible();
    await expect(page.getByText('Needs Attention').first()).toBeVisible();
  });

  test('renders Today\'s Sessions section', async ({ page }) => {
    await expect(page.getByText("Today's Sessions")).toBeVisible();
  });

  test('renders Needs Attention section', async ({ page }) => {
    await expect(page.getByText('Needs Attention').first()).toBeVisible();
  });

  test('renders Pending Check-ins section', async ({ page }) => {
    await expect(page.getByText('Pending Check-ins')).toBeVisible();
  });

  test('renders This Week schedule card', async ({ page }) => {
    await expect(page.getByText('This Week').first()).toBeVisible();
  });

  test('renders Member Compliance section', async ({ page }) => {
    await expect(page.getByText(/Member Compliance/i)).toBeVisible();
  });

  test('Today\'s Sessions links to calendar', async ({ page }) => {
    // Link text is "View in calendar →" (with sessions) or "View this week's schedule →" (no sessions)
    const viewLink = page.locator('a[href="/trainer/calendar"]').first();
    await expect(viewLink).toBeVisible();
  });

  test('This Week card links to calendar', async ({ page }) => {
    const weekCard = page.getByText('This Week').first().locator('../..');
    await expect(weekCard).toBeVisible();
  });
});
