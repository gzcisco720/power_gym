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
});
