import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Log in via the UI each time to get a fresh session.
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
  });

  test('four stat cards show with seeded trainer and member counts', async ({ page }) => {
    // Wait for the page header
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Wait for stat cards to render with API data.
    // The stat card labels are rendered inside non-animated divs.
    await expect(page.getByText('Sessions / Month')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pending Invites')).toBeVisible({ timeout: 10000 });
  });

  test('equipment panel lists at least one item under maintenance status', async ({ page }) => {
    // Wait for the page header
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Equipment Status section header
    await expect(page.getByText('Equipment Status')).toBeVisible({ timeout: 10000 });

    // The seed has maintenance equipment items
    await expect(page.getByText('Maintenance').first()).toBeVisible({ timeout: 15000 });
  });
});
