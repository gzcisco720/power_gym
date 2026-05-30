import { test, expect } from '@playwright/test';

test.describe('Owner Trainers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
    await page.goto('/owner/trainers');
    await expect(page.getByRole('heading', { name: 'Trainers' })).toBeVisible({ timeout: 10000 });
  });

  test('trainers list loads with seeded trainer', async ({ page }) => {
    // Wait for trainer data to load
    await expect(page.getByText('Test Trainer')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a trainer navigates to /owner/trainers/:id', async ({ page }) => {
    // Wait for trainer to be visible
    await expect(page.getByText('Test Trainer')).toBeVisible({ timeout: 10000 });

    // Click the "View Hub →" button for the first trainer
    await page.getByRole('button', { name: 'View Hub →' }).first().click();

    // URL should change to /owner/trainers/:id
    await expect(page).toHaveURL(/\/owner\/trainers\/[a-f0-9]+/, { timeout: 10000 });
  });
});
