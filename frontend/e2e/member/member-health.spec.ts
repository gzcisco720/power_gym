import { test, expect } from '@playwright/test';

test.describe('Member Health', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member on /member/health sees injury list section', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByText('My Health')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Injuries')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '+ Report Injury' })).toBeVisible();
  });

  test('member adds an injury and it appears in list', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByRole('button', { name: '+ Report Injury' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: '+ Report Injury' }).click();

    // Fill out injury form in the sheet
    const titleInput = page.getByPlaceholder('e.g. Left knee pain');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('Test Knee Pain E2E');

    // Submit
    await page.getByRole('button', { name: 'Report' }).click();

    // Should appear in the injuries list
    await expect(page.getByText('Test Knee Pain E2E')).toBeVisible({ timeout: 10000 });
  });
});
