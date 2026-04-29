import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Trainers', () => {
  test('trainer list shows trainer email', async ({ page }) => {
    await page.goto('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('expand Members shows member@test.com', async ({ page }) => {
    await page.goto('/owner/trainers');
    const trainerRow = page.getByText('trainer@test.com', { exact: true }).locator('..').locator('..');
    await trainerRow.getByRole('button', { name: /members/i }).click();
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('View → link navigates to trainer hub', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub shows back link to all trainers', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: '← All Trainers' })).toBeVisible();
  });

  test('back link returns to trainer list', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.getByRole('link', { name: '← All Trainers' }).click();
    await page.waitForURL('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('overview shows 3 stat cards', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByText('会员数')).toBeVisible();
    await expect(page.getByText('本月训练')).toBeVisible();
    await expect(page.getByText('训练模板')).toBeVisible();
  });

  test('members tab shows member with View and Reassign', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/members"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    await expect(page.getByText('Test Member')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View →' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reassign/i }).first()).toBeVisible();
  });

  test('calendar tab renders week grid with navigation', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/calendar"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/calendar$/);
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('reassign from trainer hub removes member from trainer list', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/members"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    const row = page.getByText('Hub Reassign Member').locator('..').locator('..');
    await row.getByRole('button', { name: /reassign/i }).click();
    await expect(page.getByText('Hub Reassign Member').first()).toBeVisible();
    await page.getByRole('button', { name: /confirm reassign/i }).click();
    // Wait for modal to close after successful reassign
    await expect(page.getByRole('button', { name: /confirm reassign/i })).not.toBeVisible({ timeout: 10000 });
    // After router.refresh(), Hub Reassign Member is no longer in this trainer's list
    await expect(page.getByText('Hub Reassign Member').first()).not.toBeVisible({ timeout: 10000 });
  });
});
