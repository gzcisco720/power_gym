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

  test('Empty state — clicking PPL preset routes to /trainer/plans/new?preset=ppl', async ({
    page,
  }) => {
    await page.goto('/trainer/my-training');

    // Empty-state ActivityStrip shows the "Get started" eyebrow.
    await expect(page.getByText(/get started/i)).toBeVisible();

    // EmptyCard renders one button per preset; PPL's accessible name is the
    // preset name "Push · Pull · Legs" plus the summary.
    await page.getByRole('button', { name: /push · pull · legs/i }).click();

    await expect(page).toHaveURL(/\/trainer\/plans\/new\?preset=ppl/);
    // The plan-template form should prefill the name from the preset.
    await expect(page.locator('#plan-name')).toHaveValue('Push · Pull · Legs');
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

  test('Empty state — Browse templates routes to /trainer/plans', async ({ page }) => {
    await page.goto('/trainer/my-training');
    await page.getByRole('button', { name: /browse templates/i }).click();
    await expect(page).toHaveURL(/\/trainer\/plans$/);
  });
});
