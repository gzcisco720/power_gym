import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Dashboard', () => {
  test('shows stat cards and trainer breakdown', async ({ page }) => {
    await page.goto('/dashboard/owner');

    await expect(page.getByText('Trainers')).toBeVisible();
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Sessions / mo')).toBeVisible();
    await expect(page.getByText('Pending Invites')).toBeVisible();

    await expect(page.getByText('trainer@test.com')).toBeVisible();
  });
});
