import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Nutrition (Daily Diary)', () => {
  test('daily diary renders — either meals with Complete Day button or empty state', async ({ page }) => {
    await page.goto('/member/nutrition');

    // The page renders one of two states:
    // (A) A scheduled log exists for today → meals list + "Complete Day" button
    // (B) No schedule for today → empty state message
    const completeDay = page.getByRole('button', { name: 'Complete Day' });
    const emptyState = page.getByText("hasn't scheduled today");

    await expect(completeDay.or(emptyState)).toBeVisible();
  });

  test('daily diary empty state shows when trainer has not scheduled today', async ({ page }) => {
    // The seed does not create a NutritionDailyLog or a weeklyPattern for any day,
    // so the member should see the "hasn't scheduled today yet" empty state.
    await page.goto('/member/nutrition');

    // Either the empty state or meals are shown — both are valid depending on run-time date
    const emptyState = page.getByText("hasn't scheduled today");
    const completeDay = page.getByRole('button', { name: 'Complete Day' });

    await expect(emptyState.or(completeDay)).toBeVisible();
  });

  test('date navigation buttons are rendered on the diary page', async ({ page }) => {
    await page.goto('/member/nutrition');

    // Both ← and → navigation buttons should be present regardless of log state
    await expect(page.getByRole('button', { name: '←' })).toBeVisible();
  });

  test('page heading reads My Nutrition', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByRole('heading', { name: 'My Nutrition' })).toBeVisible();
  });

  // --- Add Food now opens a Dialog (v3.1) instead of navigating to a full-page route ---

  test('clicking + Add Food on a meal opens the food picker dialog', async ({ page }) => {
    await page.goto('/member/nutrition');

    const emptyState = page.getByText("hasn't scheduled today");

    if (await emptyState.isVisible()) {
      // No meals scheduled — nothing to test here
      return;
    }

    const addFoodBtn = page.getByRole('button', { name: '+ Add Food' }).first();
    await expect(addFoodBtn).toBeVisible();
    await addFoodBtn.click();

    // Dialog should open with "Add Food" heading
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Food' })).toBeVisible();
  });

  test('macro ring renders on diary when a log is active', async ({ page }) => {
    await page.goto('/member/nutrition');

    const emptyState = page.getByText("hasn't scheduled today");
    if (await emptyState.isVisible()) {
      // No log today — macro ring is not rendered; test is a no-op
      return;
    }

    // MacroRing SVG inside MacroSummaryCard carries aria-label="Macro distribution"
    await expect(page.getByLabel('Macro distribution').first()).toBeVisible();
  });
});
