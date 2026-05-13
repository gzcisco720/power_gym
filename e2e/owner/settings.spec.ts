import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Settings', () => {
  test('profile tab loads with expected fields', async ({ page }) => {
    await page.goto('/owner/settings?tab=profile');
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#mobile')).toBeVisible();
    await expect(page.locator('#certifications')).toBeVisible();
  });

  test('save profile — values persist after reload', async ({ page }) => {
    await page.goto('/owner/settings?tab=profile');

    await page.fill('#firstName', 'E2E');
    await page.fill('#lastName', 'OwnerTest');
    await page.fill('#mobile', '0400555666');
    await page.fill('#certifications', 'CPT, CSCS');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#firstName')).toHaveValue('E2E');
    await expect(page.locator('#lastName')).toHaveValue('OwnerTest');
    await expect(page.locator('#mobile')).toHaveValue('0400555666');
    await expect(page.locator('#certifications')).toHaveValue('CPT, CSCS');
  });

  test('gym info tab — save and persist', async ({ page }) => {
    await page.goto('/owner/settings?tab=gym-info');

    await page.fill('#gymName', 'E2E Power Gym');
    await page.fill('#gymAddress', '123 Test Street');
    await page.fill('#gymPhone', '0299990000');
    await page.getByRole('button', { name: 'Save Gym Info' }).click();

    await expect(page.getByRole('button', { name: 'Save Gym Info' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#gymName')).toHaveValue('E2E Power Gym');
    await expect(page.locator('#gymAddress')).toHaveValue('123 Test Street');
    await expect(page.locator('#gymPhone')).toHaveValue('0299990000');
  });

  test('tabs navigate correctly — no Account tab', async ({ page }) => {
    await page.goto('/owner/settings');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gym Info' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account' })).not.toBeVisible();
  });
});
