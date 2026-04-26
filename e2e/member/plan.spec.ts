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

  test('log a set in a session', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /start session/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/new/);
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/);

    await page.getByRole('button', { name: 'Set 1' }).click();
    await page.fill('[aria-label="Weight (kg)"]', '60');
    await page.fill('[aria-label="Reps"]', '10');
    await page.getByRole('button', { name: /log set/i }).click();

    await expect(page.getByText('Set logged')).toBeVisible();
  });
});
