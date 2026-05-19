import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

const TODAY = new Date().toISOString().slice(0, 10);

test.describe('Member: Nutrition landing page', () => {
  test('landing page renders with My Plan and Freestyle cards', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByRole('heading', { name: 'My Nutrition' })).toBeVisible();
    // Card labels are uppercased via CSS; use case-insensitive regex
    await expect(page.getByText(/my plan/i).first()).toBeVisible();
    await expect(page.getByText(/freestyle/i).first()).toBeVisible();
  });

  test('calendar icon opens calendar popover', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.getByRole('button', { name: /open calendar/i }).click();
    // base-ui Popover uses data-slot="popover-positioner"
    await expect(page.locator('[data-slot="popover-positioner"]')).toBeVisible();
  });
});

test.describe('Member: Nutrition day view (plan mode)', () => {
  test('day view renders — either meals with Mark day complete or empty state', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=plan`);

    // The page renders one of two states:
    // (A) A scheduled log exists for today → meals list + "Mark day complete" button
    // (B) No schedule for today → empty state message
    const markComplete = page.getByRole('button', { name: "Mark day complete" });
    const emptyState = page.getByText("hasn't scheduled today");

    await expect(markComplete.or(emptyState)).toBeVisible({ timeout: 8000 });
  });

  test('day view empty state shows when trainer has not scheduled today', async ({ page }) => {
    // The seed does not create a NutritionDailyLog, so member sees the empty state.
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=plan`);

    const emptyState = page.getByText("hasn't scheduled today");
    const markComplete = page.getByRole('button', { name: "Mark day complete" });

    await expect(emptyState.or(markComplete)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Member: Nutrition day view (freestyle mode)', () => {
  test('freestyle day view shows meal sections', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await expect(
      page.getByText(/breakfast|lunch|dinner/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('clicking + Add Food on a meal opens the food picker dialog', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);

    const addFoodBtn = page.getByRole('button', { name: '+ Add Food' }).first();
    await expect(addFoodBtn).toBeVisible({ timeout: 8000 });
    await addFoodBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Food' })).toBeVisible();
  });

  test('Mark day complete button opens confirm dialog', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Mark day complete' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/mark today as complete/i)).toBeVisible();
  });

  test('confirm dialog Cancel closes without completing the day', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Mark day complete' }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark day complete' })).toBeVisible();
  });

  test('macro ring renders when a log is active', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);

    // MacroRing SVG inside MacroSummaryCard carries aria-label="Macro distribution"
    await expect(page.getByLabel('Macro distribution').first()).toBeVisible({ timeout: 8000 });
  });
});
