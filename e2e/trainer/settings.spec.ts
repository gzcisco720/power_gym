import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Settings', () => {
  test('profile tab loads with firstName and lastName', async ({ page }) => {
    await page.goto('/trainer/settings?tab=profile');
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#mobile')).toBeVisible();
    await expect(page.locator('#bio')).toBeVisible();
  });

  test('save profile — values persist after reload', async ({ page }) => {
    await page.goto('/trainer/settings?tab=profile');

    await page.fill('#firstName', 'E2E');
    await page.fill('#lastName', 'TrainerTest');
    await page.fill('#mobile', '0400111222');
    await page.fill('#bio', 'E2E trainer bio updated');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#firstName')).toHaveValue('E2E');
    await expect(page.locator('#lastName')).toHaveValue('TrainerTest');
    await expect(page.locator('#mobile')).toHaveValue('0400111222');
    await expect(page.locator('#bio')).toHaveValue('E2E trainer bio updated');
  });

  test('security tab shows change password form', async ({ page }) => {
    await page.goto('/trainer/settings?tab=security');
    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByText('Forgot your password')).not.toBeVisible();
  });

  test('tabs navigate correctly', async ({ page }) => {
    await page.goto('/trainer/settings');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account' })).not.toBeVisible();
  });
});
