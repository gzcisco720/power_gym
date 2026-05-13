import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Members', () => {
  test('member list shows member email and trainer name', async ({ page }) => {
    await page.goto('/owner/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
    await expect(page.getByText('Test Trainer', { exact: true }).nth(1)).toBeVisible();
  });

  test('reassign member to a different trainer', async ({ page }) => {
    await page.goto('/owner/members');
    const memberRow = page.getByText('reassign-member@test.com', { exact: true }).locator('..').locator('..');
    await memberRow.getByRole('button', { name: /reassign/i }).click();

    await page.selectOption('select', { label: 'Test Trainer2' });
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByText('reassign-member@test.com', { exact: true })
      .locator('..').locator('..')
      .getByText('Test Trainer2')).toBeVisible({ timeout: 10000 });

    // Verify member-assigned email sent to the receiving trainer
    const email = await waitForEmailTo('trainer2@test.com', {
      subject: /New Member/,
    });
    expect(email.Subject).toBe('New Member(s) Assigned to You — POWER GYM');
    expect(email.HTML).toContain('Reassign Member');
  });

  test('View link navigates to member hub page', async ({ page }) => {
    await page.goto('/owner/members');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub shows back link for owner', async ({ page }) => {
    await page.goto('/owner/members');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await expect(page.getByRole('link', { name: '← All Members' })).toBeVisible();
  });

  test('owner back link returns to owner members page', async ({ page }) => {
    await page.goto('/owner/members');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: '← All Members' }).click();
    await page.waitForURL('/owner/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });
});
