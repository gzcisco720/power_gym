import { test, expect } from '@playwright/test';

// Verifies the My Training cockpit Empty-state path interactions.
//
// The seed (`e2e/seed.ts`) does NOT pre-create any SelfWorkoutLog for the
// trainer, so by default the cockpit renders Empty state. The Light/Full
// state entries are exercised by `trainer-template-workout.spec.ts` (which
// seeds a completed log) and `trainer-freestyle-workout.spec.ts` (which uses
// the always-visible "Start blank" button on the Freestyle card).

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('My Training cockpit', () => {
  test.beforeEach(async ({ request }) => {
    // Reset cockpit to Empty state: prior tests in this run may have left
    // completed logs (which would push the cockpit into Light/Full state).
    // Delete the active log first, then every log in the current and previous
    // calendar month so the trainer sees the Empty cockpit.
    const activeRes = await request.get('/api/me/workout-logs/active');
    const active = (await activeRes.json()) as { _id?: string } | null;
    if (active && active._id) {
      await request.delete(`/api/me/workout-logs/${active._id}`);
    }

    const now = new Date();
    const monthsToScrub: Array<{ year: number; month: number }> = [
      { year: now.getFullYear(), month: now.getMonth() + 1 },
    ];
    // Prior month — handles tests run near a month boundary.
    const prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    monthsToScrub.push({ year: prior.getFullYear(), month: prior.getMonth() + 1 });

    for (const { year, month } of monthsToScrub) {
      const listRes = await request.get(`/api/me/workout-logs?year=${year}&month=${month}`);
      if (!listRes.ok()) continue;
      const logs = (await listRes.json()) as Array<{ _id: string }>;
      for (const log of logs) {
        await request.delete(`/api/me/workout-logs/${log._id}`);
      }
    }
  });

  test('Template card shows expandable template list in empty-log state', async ({
    page,
  }) => {
    await page.goto('/trainer/my-training');

    // Empty-state ActivityStrip shows the "Get started" eyebrow.
    await expect(page.getByText(/get started/i)).toBeVisible();

    // The seeded trainer has templates — the card renders as an expandable list.
    await expect(page.getByText(/from template/i)).toBeVisible();
    await expect(page.getByText(/pick any day/i)).toBeVisible();
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('Freestyle path — Start blank creates a log and routes to the session', async ({
    page,
    request,
  }) => {
    page.on('dialog', (d) => {
      void d.dismiss();
    });

    await page.goto('/trainer/my-training');
    await page.getByRole('button', { name: /start blank/i }).click();
    await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);

    // Cleanup: discard the log so subsequent tests aren't polluted.
    const activeRes = await request.get('/api/me/workout-logs/active');
    const active = (await activeRes.json()) as { _id?: string } | null;
    if (active && active._id) {
      await request.delete(`/api/me/workout-logs/${active._id}`);
    }
  });

  test('Template card — expanding template reveals Log buttons per day', async ({ page }) => {
    await page.goto('/trainer/my-training');
    // Click the template row to expand it.
    await page.getByRole('button', { name: /E2E Test Plan/i }).click();
    // After expanding, at least one "Log" button should appear.
    await expect(page.getByRole('button', { name: /^Log$/i }).first()).toBeVisible();
  });
});
