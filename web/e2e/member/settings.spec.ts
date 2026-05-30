import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Settings', () => {
  test('profile tab loads with expected fields', async ({ page }) => {
    await page.goto('/member/settings?tab=profile');
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#mobile')).toBeVisible();
    await expect(page.locator('#sex')).toBeVisible();
    await expect(page.locator('#fitnessGoal')).toBeVisible();
    await expect(page.locator('#fitnessLevel')).toBeVisible();
  });

  test('save profile — values persist after reload', async ({ page }) => {
    await page.goto('/member/settings?tab=profile');

    await page.fill('#firstName', 'E2E');
    await page.fill('#lastName', 'MemberTest');
    await page.fill('#mobile', '0400333444');
    await page.selectOption('#fitnessGoal', 'build_muscle');
    await page.selectOption('#fitnessLevel', 'intermediate');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByText('Profile saved')).toBeVisible();

    await page.reload();

    await expect(page.locator('#firstName')).toHaveValue('E2E');
    await expect(page.locator('#lastName')).toHaveValue('MemberTest');
    await expect(page.locator('#mobile')).toHaveValue('0400333444');
    await expect(page.locator('#fitnessGoal')).toHaveValue('build_muscle');
    await expect(page.locator('#fitnessLevel')).toHaveValue('intermediate');

    // Restore seed data so other tests are not affected
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'Member');
    await page.fill('#mobile', '');
    await page.selectOption('#fitnessGoal', '');
    await page.selectOption('#fitnessLevel', '');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();
  });

  test('tabs navigate correctly — no Account tab', async ({ page }) => {
    await page.goto('/member/settings');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account' })).not.toBeVisible();
  });
});
