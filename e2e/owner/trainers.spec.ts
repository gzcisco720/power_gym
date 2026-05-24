import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Trainers', () => {
  test('trainer list shows trainer email', async ({ page }) => {
    await page.goto('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('hub members tab shows Test Member', async ({ page }) => {
    await page.goto('/owner/trainers');
    const trainerRow = page.getByText('trainer@test.com', { exact: true }).locator('..').locator('..');
    await trainerRow.getByRole('link', { name: /view hub/i }).click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/members"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    await expect(page.getByText('Test Member', { exact: true })).toBeVisible();
  });

  test('View link navigates to trainer hub', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub shows back link to all trainers', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: '← All Trainers' })).toBeVisible();
  });

  test('back link returns to trainer list', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.getByRole('link', { name: '← All Trainers' }).click();
    await page.waitForURL('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('overview shows 3 stat cards', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByText('Members').first()).toBeVisible();
    await expect(page.getByText('Sessions / Mo').first()).toBeVisible();
    await expect(page.getByText('Templates').first()).toBeVisible();
  });

  test('members tab shows member with View and Reassign', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/members"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    await expect(page.getByText('Test Member').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View →', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reassign/i }).first()).toBeVisible();
  });

  test('calendar tab renders week grid with navigation', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/calendar"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/calendar$/);
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('reassign from trainer hub removes member from trainer list and sends email', async ({ page }) => {
    const before = new Date();
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: /view hub/i }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.locator('a[href*="/owner/trainers/"][href$="/members"]').click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    const row = page.getByText('Hub Reassign').locator('..').locator('..');
    await row.getByRole('button', { name: /reassign/i }).click();
    await expect(page.getByText('Hub Reassign').first()).toBeVisible();
    await page.getByRole('button', { name: /confirm reassign/i }).click();
    await expect(page.getByRole('button', { name: /confirm reassign/i })).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hub Reassign').first()).not.toBeVisible({ timeout: 10000 });

    // Verify member-assigned email sent to the trainer receiving the member
    const email = await waitForEmailTo('trainer2@test.com', {
      subject: /New Member/,
      since: before,
    });
    expect(email.Subject).toBe('New Member(s) Assigned to You — POWER GYM');
    expect(email.HTML).toContain('Hub Reassign');
  });
});
