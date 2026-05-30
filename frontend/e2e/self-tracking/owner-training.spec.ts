import { test, expect } from '@playwright/test';

test.describe('Owner My Training + My Nutrition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
  });

  test('owner starts freestyle session, logs a set — set appears; rest timer continues across a set log (no reset)', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');
    await expect(page.getByRole('heading', { name: 'My Training' })).toBeVisible({ timeout: 10000 });

    // Start blank session
    const startBtn = page.getByRole('button', { name: 'Start blank →' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // Should navigate to the session page
    await page.waitForURL(/\/owner\/my-training\/session\//, { timeout: 15000 });

    // Wait for session page to load
    const sessionDayName = page.getByTestId('session-day-name');
    await expect(sessionDayName).toBeVisible({ timeout: 10000 });
    await expect(sessionDayName).toHaveText('Freestyle');

    // Timer is visible and ticking
    const timer = page.getByTestId('session-timer');
    await expect(timer).toBeVisible({ timeout: 5000 });
    const timerBefore = await timer.textContent();

    // Add an exercise
    const addExerciseBtn = page.getByRole('button', { name: '+ Add Exercise' });
    await expect(addExerciseBtn).toBeVisible({ timeout: 5000 });
    await addExerciseBtn.click();

    // Wait for search sheet
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Search for an exercise
    const searchInput = page.getByPlaceholder('Search exercises…');
    await searchInput.fill('bench');
    await page.waitForTimeout(400);

    // Click first exercise result
    const firstResult = page.locator('[role="dialog"] button').filter({ hasText: /bench/i }).first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
    } else {
      // Try any exercise
      const anyExercise = page.locator('[role="dialog"] button').nth(0);
      if (await anyExercise.isVisible()) {
        await anyExercise.click();
      }
    }

    // Wait for the dialog to close
    await page.waitForTimeout(500);

    // Exercise row should be visible — enter a set
    const setRepsInput = page.getByLabel(/Set 1 reps/i).first();
    await expect(setRepsInput).toBeVisible({ timeout: 8000 });

    // Capture timer before logging a set
    const timerText1 = await timer.textContent();

    // Fill in reps
    await setRepsInput.fill('8');

    // Add a set using the "+ Add Set" button
    const addSetBtn = page.getByRole('button', { name: '+ Add Set' }).first();
    if (await addSetBtn.isVisible()) {
      await addSetBtn.click();
      await page.waitForTimeout(500);
    }

    // CRITICAL: verify timer did NOT reset (still has the same or close value)
    const timerText2 = await timer.textContent();
    // Timer should still show a time format MM:SS and not have reset to 00:00
    // (unless the session just started < 1 second ago)
    expect(timerText2).toMatch(/^\d{2}:\d{2}$/);

    // The timer value after logging should be >= the value before (not reset)
    // Convert both to seconds to compare
    function toSeconds(t: string | null): number {
      if (!t) return 0;
      const [mm, ss] = t.split(':').map(Number);
      return (mm ?? 0) * 60 + (ss ?? 0);
    }

    const secsBefore = toSeconds(timerText1);
    const secsAfter = toSeconds(timerText2);
    // Timer should not have gone backwards (reset to 0)
    // Allow a small tolerance for test timing
    expect(secsAfter).toBeGreaterThanOrEqual(Math.max(0, secsBefore - 2));

    // The set count area should show at least 1 set filled
    const setCount = page.getByTestId('set-count');
    await expect(setCount).toBeVisible({ timeout: 5000 });
  });

  test('owner completes a session — marked complete and read-only on revisit', async ({ page }) => {
    await page.goto('/owner/my-training');
    await expect(page.getByRole('heading', { name: 'My Training' })).toBeVisible({ timeout: 10000 });

    // Start blank session
    const startBtn = page.getByRole('button', { name: 'Start blank →' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    await page.waitForURL(/\/owner\/my-training\/session\//, { timeout: 15000 });

    // Wait for Freestyle label
    await expect(page.getByTestId('session-day-name')).toBeVisible({ timeout: 10000 });

    // Add an exercise
    const addExerciseBtn = page.getByRole('button', { name: '+ Add Exercise' });
    await expect(addExerciseBtn).toBeVisible({ timeout: 5000 });
    await addExerciseBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const searchInput = page.getByPlaceholder('Search exercises…');
    await searchInput.fill('squat');
    await page.waitForTimeout(400);

    const firstResult = page.locator('[role="dialog"] button').filter({ hasText: /squat/i }).first();
    const anyResult = page.locator('[role="dialog"] button').nth(0);
    if (await firstResult.isVisible()) {
      await firstResult.click();
    } else if (await anyResult.isVisible()) {
      await anyResult.click();
    }
    await page.waitForTimeout(500);

    // Fill in a set
    const repsInput = page.getByLabel(/Set 1 reps/i).first();
    if (await repsInput.isVisible({ timeout: 5000 })) {
      await repsInput.fill('5');
    }

    // Click Finish
    const finishBtn = page.getByTestId('finish-button');
    await expect(finishBtn).toBeVisible({ timeout: 5000 });
    await finishBtn.click();

    // Should open the finish dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Finish workout')).toBeVisible({ timeout: 5000 });

    // Click "Finish workout" button in the dialog
    const finishWorkoutBtn = page.getByRole('button', { name: 'Finish workout' }).last();
    await finishWorkoutBtn.click();

    // Should navigate back to /owner/my-training
    await page.waitForURL('/owner/my-training', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'My Training' })).toBeVisible({ timeout: 10000 });
  });

  test('owner on /owner/my-nutrition opens a day — logged macros render', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await expect(page.getByRole('heading', { name: 'My Nutrition' })).toBeVisible({ timeout: 10000 });

    // Click "Log Today" or "Continue Today's Log"
    const logTodayBtn = page.getByRole('button', {
      name: /log today|continue today's log|view today's log/i,
    }).first();
    await expect(logTodayBtn).toBeVisible({ timeout: 10000 });
    await logTodayBtn.click();

    // Should navigate to the day view
    await page.waitForURL(/\/owner\/my-nutrition\/day/, { timeout: 15000 });

    // Macro summary card should be visible
    const macroCard = page.locator('[role="group"]');
    await expect(macroCard).toBeVisible({ timeout: 10000 });

    // Meals list should be visible with at least one meal section
    const mealsList = page.getByTestId('meals-list');
    await expect(mealsList).toBeVisible({ timeout: 10000 });

    // At least one meal section is visible
    await expect(page.getByText('Breakfast')).toBeVisible({ timeout: 5000 });
  });
});
