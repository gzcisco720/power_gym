import { test, expect } from '@playwright/test';

test.describe('Member Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member on /member/settings sees profile tab with save button disabled', async ({
    page,
  }) => {
    await page.goto('/member/settings');
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Profile')).toBeVisible();
    // Save button is disabled when form is not dirty
    const saveBtn = page.getByRole('button', { name: 'Save Profile' });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await expect(saveBtn).toBeDisabled();
  });

  test('member edits profile mobile, saves → persisted on reload', async ({ page }) => {
    await page.goto('/member/settings');
    await expect(page.getByLabel('Mobile')).toBeVisible({ timeout: 10000 });

    // Enter a mobile number to make form dirty
    const mobileInput = page.getByLabel(/mobile/i);
    await mobileInput.fill('+1 555 987 6543');

    const saveBtn = page.getByRole('button', { name: 'Save Profile' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Toast success
    await expect(page.getByText('Profile saved')).toBeVisible({ timeout: 8000 });

    // Reload and verify
    await page.reload();
    await expect(page.getByLabel(/mobile/i)).toHaveValue('+1 555 987 6543', { timeout: 10000 });
  });

  test('/member/schedule shows schedule page', async ({ page }) => {
    await page.goto('/member/schedule');
    await expect(page.getByText('My Schedule')).toBeVisible({ timeout: 10000 });
  });
});
