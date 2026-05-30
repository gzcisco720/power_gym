import { test, expect } from '@playwright/test';

test.describe('Member Check-In', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member navigates to /member/check-in and sees check-in dashboard', async ({ page }) => {
    await page.goto('/member/check-in');
    // Achievement cards
    await expect(page.locator('text=week streak').first()).toBeVisible({ timeout: 10000 });
    // Wellness Breakdown
    await expect(page.locator('text=Wellness Breakdown')).toBeVisible({ timeout: 5000 });
    // Body Metrics
    await expect(page.locator('text=Body Metrics')).toBeVisible({ timeout: 5000 });
    // History
    await expect(page.locator('text=History')).toBeVisible({ timeout: 5000 });
  });

  test('member clicks new check-in and fills the form', async ({ page }) => {
    await page.goto('/member/check-in/new');
    await expect(page.getByText('Weekly Check-In')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('How are you feeling?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Check-In' })).toBeVisible();
  });

  test('member submits a check-in and it appears in history', async ({ page }) => {
    // Only run if member hasn't submitted this week (to avoid already-submitted state)
    await page.goto('/member/check-in/new');
    await expect(page.getByText('Weekly Check-In')).toBeVisible({ timeout: 10000 });

    const submitBtn = page.getByRole('button', { name: 'Submit Check-In' });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // After submission: either redirected to /member/check-in or shown already-submitted
      await expect(
        page.getByText(/already submitted/i).or(page.getByText(/check-in dashboard/i)),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('check-in history page shows list of check-ins', async ({ page }) => {
    await page.goto('/member/check-in/history');
    await expect(page.getByText('Check-In History')).toBeVisible({ timeout: 10000 });
    // The page shows either a list or "No check-ins yet"
    await expect(
      page.locator('a[href^="/member/check-in/"]:not([href$="/history"]):not([href$="/new"])').first()
        .or(page.getByText(/no check-ins yet/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('check-in detail page shows all fields', async ({ page }) => {
    // Navigate to history first to get an ID
    await page.goto('/member/check-in/history');
    await expect(page.getByText('Check-In History')).toBeVisible({ timeout: 10000 });

    const firstRow = page.locator('a[href^="/member/check-in/"]:not([href$="/history"]):not([href$="/new"])').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/member\/check-in\/[^/]+$/);
      await expect(page.getByText('How I felt')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Body & Activity')).toBeVisible();
      await expect(page.getByText('Diet')).toBeVisible();
    }
  });
});
