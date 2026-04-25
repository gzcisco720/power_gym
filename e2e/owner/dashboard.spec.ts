import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Dashboard', () => {
  test('shows stat cards and trainer breakdown', async ({ page }) => {
    await page.goto('/owner');

    await expect(page.getByText('Sessions / mo').first()).toBeVisible();
    await expect(page.getByText('Pending Invites').first()).toBeVisible();
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });
});
