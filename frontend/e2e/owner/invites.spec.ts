import { test, expect } from '@playwright/test';

test.describe('Owner Invites', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
    await page.goto('/owner/invites');
    await expect(page.getByRole('heading', { name: 'Invites' })).toBeVisible({ timeout: 10000 });
  });

  test('invites page loads with stat cards', async ({ page }) => {
    await expect(page.getByText('Pending')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Accepted')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Expired')).toBeVisible({ timeout: 10000 });
  });

  test('creates invite for a new email — it appears in the list', async ({ page }) => {
    // Click + Invite button
    await page.getByRole('button', { name: '+ Invite' }).click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill in email
    const uniqueEmail = `e2e-invite-${Date.now()}@test.com`;
    await page.fill('#invite-email', uniqueEmail);

    // Submit
    await page.getByRole('button', { name: /generate invite link/i }).click();

    // Success toast
    await expect(page.getByText('Invite link generated')).toBeVisible({ timeout: 10000 });

    // Close dialog or verify the new invite appears
    // The invite URL should appear in the dialog
    await expect(page.getByText('/register?token=')).toBeVisible({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press('Escape');

    // The new email should now appear in the Pending list
    await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 10000 });
  });
});
