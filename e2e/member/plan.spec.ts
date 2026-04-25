import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Training Plan', () => {
  test('plan page shows plan name and day name', async ({ page }) => {
    await page.goto('/member/plan');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
    await expect(page.getByText('Push')).toBeVisible();
  });

  test('start session navigates to session page', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /start session/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/new/);
    await expect(page).toHaveURL(/\/member\/plan\/session\/new/);
  });
});
