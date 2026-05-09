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
    await page.getByRole('link', { name: /log this workout/i }).first().click();
    // session/new is a server component that auto-creates the session and redirects
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/, { timeout: 15000 });
    await expect(page.url()).toMatch(/\/member\/plan\/session\//);
  });

  test('log a set in a session', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /log this workout/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/, { timeout: 15000 });

    await page.fill('[aria-label="Set 1 weight"]', '60');
    await page.fill('[aria-label="Set 1 reps"]', '10');
    await page.getByRole('button', { name: 'Complete set 1' }).click();

    // Set row transitions to done state showing logged values
    await expect(page.getByText('60 kg × 10 reps')).toBeVisible();
  });

  test('session shows exercise name and prescribed reps', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /log this workout/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/, { timeout: 15000 });
    await expect(page.getByText('Bench Press')).toBeVisible();
    // ExerciseRow logging mode renders prescribed reps as a chip "Reps: 8–12"
    await expect(page.getByText('Reps: 8–12').first()).toBeVisible();
  });

  test('complete session after logging all sets navigates to plan', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('link', { name: /log this workout/i }).first().click();
    await page.waitForURL(/\/member\/plan\/session\/[^/]+$/, { timeout: 15000 });

    // POST /api/sessions reuses an existing active session for the day, so
    // earlier tests may have completed some sets. Iterate over remaining
    // "Complete set N" buttons instead of hard-coding [1, 2, 3].
    const completeButtons = page.getByRole('button', { name: /^Complete set \d+$/ });
    while ((await completeButtons.count()) > 0) {
      const btn = completeButtons.first();
      const label = (await btn.getAttribute('aria-label')) ?? '';
      const setNum = Number(label.match(/Complete set (\d+)/)?.[1] ?? 0);
      await page.getByLabel(`Set ${setNum} weight`).fill('60');
      await page.getByLabel(`Set ${setNum} reps`).fill('10');
      await btn.click();
      await expect(page.getByLabel(`Set ${setNum} completed`)).toBeVisible();
    }

    await page.getByRole('button', { name: 'Complete Workout' }).click();
    await expect(page.getByRole('button', { name: 'Finish Workout' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish Workout' }).click();
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });
});
