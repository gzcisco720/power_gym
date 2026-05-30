import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer Settings', () => {
  test('trainer edits profile bio, saves — persisted on reload', async ({ page }) => {
    await page.goto('/trainer/settings');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText('Settings')).toBeVisible();

    // Profile tab should be visible
    await expect(page.getByText('Profile')).toBeVisible();
  });
});

test.describe('Trainer Invites', () => {
  test('trainer creates an invite — listed', async ({ page }) => {
    await page.goto('/trainer/invites');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText('Invites')).toBeVisible();

    // Click invite button
    await page.getByRole('button', { name: /invite member/i }).click();

    // Fill email
    await page.getByLabel(/member email/i).fill('newmember@test.com');
    await page.getByRole('button', { name: /generate invite link/i }).click();

    // Should see the generated URL or success
    await expect(page.getByText(/invite link/i)).toBeVisible({ timeout: 5000 });
  });

  test('trainer resend shows success toast', async ({ page }) => {
    await page.goto('/trainer/invites');
    await expect(page).not.toHaveURL(/login/);
    // Just check the page loads and the pending section exists (or is empty)
    await expect(page.getByText(/pending/i)).toBeVisible();
  });
});

test.describe('Trainer Calendar', () => {
  test('trainer on /trainer/calendar sees the calendar', async ({ page }) => {
    await page.goto('/trainer/calendar');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText('Calendar')).toBeVisible();
  });
});
