import { test, expect } from '@playwright/test';

test.describe('Owner Trainer Detail Hub', () => {
  let trainerId: string;

  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });

    // Navigate to trainers list and find the seeded trainer's ID
    await page.goto('/owner/trainers');
    await expect(page.getByRole('heading', { name: 'Trainers' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('trainer@test.com')).toBeVisible({ timeout: 10000 });

    // Click "View Hub →" to navigate to the trainer detail page
    await page.getByRole('button', { name: 'View Hub →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/[a-f0-9]+/, { timeout: 10000 });

    // Extract trainer ID from URL
    const url = page.url();
    const match = url.match(/\/owner\/trainers\/([a-f0-9]+)/);
    trainerId = match?.[1] ?? '';
    expect(trainerId).toBeTruthy();
  });

  test('trainer hub shows trainer name in header', async ({ page }) => {
    await expect(page.getByText('trainer@test.com')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('← All Trainers')).toBeVisible();
  });

  test('trainer hub renders all 5 tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Training Plans' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Nutrition Plans' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible();
  });

  test('clicking Members tab navigates to /owner/trainers/:id/members and shows seeded member', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: 'Members' }).click();

    // URL should change to /members sub-path
    await expect(page).toHaveURL(new RegExp(`/owner/trainers/${trainerId}/members`), { timeout: 10000 });

    // The seeded member assigned to the trainer should be listed (exact email match)
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('clicking Training Plans tab navigates and renders trainer plan templates', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Training Plans' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: 'Training Plans' }).click();

    // URL should change to /training-plans sub-path
    await expect(page).toHaveURL(new RegExp(`/owner/trainers/${trainerId}/training-plans`), { timeout: 10000 });

    // Should show count label
    await expect(page.locator('text=/Training Template/')).toBeVisible({ timeout: 10000 });
  });
});
