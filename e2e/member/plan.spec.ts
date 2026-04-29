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

  test('session shows exercise name and prescribed reps', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /start session/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/new/);
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/);
    await expect(page.getByText('Bench Press')).toBeVisible();
    await expect(page.getByText('8–12 reps').first()).toBeVisible();
  });

  test('complete session after logging all sets navigates to plan', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /start session/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/new/);
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/);

    for (const setNum of ['Set 1', 'Set 2', 'Set 3']) {
      await page.getByRole('button', { name: setNum }).click();
      await page.fill('[aria-label="Weight (kg)"]', '60');
      await page.fill('[aria-label="Reps"]', '10');
      await page.getByRole('button', { name: 'Log Set' }).click();
      await expect(page.getByText('Set logged').first()).toBeVisible();
    }

    await expect(page.getByRole('button', { name: 'Complete Session' })).toBeVisible();
    await page.getByRole('button', { name: 'Complete Session' }).click();
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });
});
