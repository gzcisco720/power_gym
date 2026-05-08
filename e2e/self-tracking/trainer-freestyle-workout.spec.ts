import { test, expect } from '@playwright/test';

// Verifies the freestyle workout flow via the new cockpit landing.
//
// What this test covers end-to-end:
//   1. Trainer navigates to /trainer/my-training (cockpit landing)
//   2. Clicks "Start blank" on the Freestyle card → POST /api/me/workout-logs
//      → redirect to /session/[id]
//   3. Session page loads with dayName heading "Freestyle"
//   4. Trainer clicks Finish → dialog opens → submits without rpe/note/saveAsTemplate
//   5. onCompleted navigates back to /trainer/my-training (cockpit)

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('trainer freestyle workout', () => {
  test.beforeEach(async ({ request }) => {
    // If a previous test left an active log, delete it so the cockpit shows
    // its empty/light state rather than "Continue".
    const activeRes = await request.get('/api/me/workout-logs/active');
    const active = (await activeRes.json()) as { _id?: string } | null;
    if (active && active._id) {
      await request.delete(`/api/me/workout-logs/${active._id}`);
    }
  });

  test('creates a freestyle log, lands on session page, finishes, returns to my-training', async ({
    page,
  }) => {
    // Suppress alert dialogs so the test can proceed past placeholder buttons
    // (e.g. "Add Exercise picker coming later").
    page.on('dialog', (d) => {
      void d.dismiss();
    });

    await page.goto('/trainer/my-training');

    // The cockpit's Freestyle card exposes a "Start blank →" button in every
    // state (empty/light/full). Click it to start a freestyle session.
    const freestyleBtn = page.getByRole('button', { name: /start blank/i });
    await expect(freestyleBtn).toBeVisible();
    await freestyleBtn.click();

    // POST /api/me/workout-logs creates a log; UI redirects to /session/[id].
    await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);

    // Session page renders <h1>{log.dayName}</h1> which should be "Freestyle".
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();

    // Open the Finish dialog.
    await page.getByRole('button', { name: /^finish$/i }).click();

    // Dialog title appears (CompleteWorkoutDialog renders <DialogTitle>Finish workout</DialogTitle>).
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible();

    // Submit the dialog without filling in rpe / note / saveAsTemplate.
    await page.getByRole('button', { name: /^finish workout$/i }).click();

    // After completion, onCompleted navigates back to the My Training start card.
    await page.waitForURL(/\/trainer\/my-training$/);

    // Returned to the My Training start-card page.
    await expect(page.getByRole('heading', { name: /^my training$/i })).toBeVisible();
  });
});
