import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Members', () => {
  test('member list shows member email and trainer name', async ({ page }) => {
    await page.goto('/dashboard/owner/members');
    await expect(page.getByText('member@test.com')).toBeVisible();
    await expect(page.getByText('Test Trainer')).toBeVisible();
  });
});
