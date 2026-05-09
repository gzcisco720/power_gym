import { test, expect } from '@playwright/test';

// Verifies the freestyle (blank) workout flow.
//
// The session page lets the trainer:
//   - pick exercises on the fly via ExerciseSearchSheet
//   - log sets with weight + reps
//   - finish the workout (with optional rpe / note / save-as-template)
// and returns to /trainer/my-training when done.

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('trainer freestyle workout', () => {
  test.beforeEach(async ({ request }) => {
    // Drop any active log so the cockpit shows its empty/light state and the
    // "Start blank →" button creates a fresh log each test.
    const activeRes = await request.get('/api/me/workout-logs/active');
    const active = (await activeRes.json()) as { _id?: string } | null;
    if (active && active._id) {
      await request.delete(`/api/me/workout-logs/${active._id}`);
    }
  });

  async function startBlankSession(page: import('@playwright/test').Page) {
    await page.goto('/trainer/my-training');
    const freestyleBtn = page.getByRole('button', { name: /start blank/i });
    await expect(freestyleBtn).toBeVisible();
    await freestyleBtn.click();
    await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();
  }

  test('finishes empty freestyle session and returns to my-training', async ({ page }) => {
    await startBlankSession(page);

    // Sticky bottom bar shows "No sets yet" until something is logged.
    await expect(page.getByText(/no sets yet/i)).toBeVisible();

    // Empty freestyle exposes the dashed picker trigger; the previous
    // placeholder alert ("Add Exercise picker coming later") is gone.
    await expect(page.getByRole('button', { name: /\+ add exercise/i })).toBeVisible();

    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible();
    await page.getByRole('button', { name: /^finish workout$/i }).click();

    await page.waitForURL(/\/trainer\/my-training$/);
    await expect(page.getByRole('heading', { name: /^my training$/i })).toBeVisible();
  });

  test('picks an exercise, logs a set, and finishes', async ({ page }) => {
    await startBlankSession(page);

    // Open the exercise picker dialog.
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await expect(page.getByRole('heading', { name: /select exercise/i })).toBeVisible();

    // Pick the seeded global exercise.
    await page.getByRole('button', { name: /^bench press/i }).first().click();

    // Picker closes and the exercise row appears in the session.
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    // Log set 1: 60 kg × 10 reps.
    await page.getByLabel('Set 1 weight').fill('60');
    await page.getByLabel('Set 1 reps').fill('10');
    await page.getByRole('button', { name: 'Complete set 1' }).click();
    await expect(page.getByLabel('Set 1 completed')).toBeVisible();

    // Status text in the sticky bar reflects the logged set.
    await expect(page.getByText(/1 \/ 1 sets logged/)).toBeVisible();

    await page.getByRole('button', { name: /^finish$/i }).click();
    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/trainer\/my-training$/);
  });
});
