import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function deleteTodayFreestyleLog(request: import('@playwright/test').APIRequestContext) {
  await request.delete(`/api/me/nutrition-logs/${TODAY}`);
}

async function seedTodayFreestyleLog(
  request: import('@playwright/test').APIRequestContext,
  opts: { dayCompleted: boolean; kcal?: number },
) {
  const kcal = opts.kcal ?? 800;
  const res = await request.put(`/api/me/nutrition-logs/${TODAY}`, {
    data: {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      dayCompleted: opts.dayCompleted,
      meals: [
        {
          name: 'Breakfast',
          order: 0,
          completed: opts.dayCompleted,
          items: [{ foodName: 'Egg', quantityG: 100, kcal, protein: 12, carbs: 1, fat: 10 }],
        },
        { name: 'Lunch', order: 1, completed: false, items: [] },
        { name: 'Dinner', order: 2, completed: false, items: [] },
        { name: 'Snack', order: 3, completed: false, items: [] },
      ],
    },
  });
  expect(res.ok()).toBe(true);
}

// ── Freestyle card: today-only, prevent re-log ────────────────────────────────

test.describe('Owner: Freestyle card — today only, no double-log', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('shows no Continue/View when no log exists for today', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Freestyle').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test("shows \"Continue Today's Log\" when incomplete freestyle log exists", async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 900 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test("shows \"View Today's Log\" when completed freestyle log exists", async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
  });

  test('"Continue Today\'s Log" navigates with noNav=1', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 900 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /continue today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });
  });

  test('"View Today\'s Log" navigates with noNav=1', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /view today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });
  });
});

// ── Freestyle day view: noNav=1 suppresses date navigation ────────────────────

test.describe('Owner: Freestyle day view — no date navigation when noNav=1', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('no ← and → navigation buttons when noNav=1', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await expect(page.getByText(TODAY)).toBeVisible({ timeout: 6000 });

    // Arrow nav buttons contain the date text alongside the arrow symbol
    const prevArrow = page.getByRole('button').filter({ hasText: /←/ });
    const nextArrow = page.getByRole('button').filter({ hasText: /→/ });

    expect(await prevArrow.count()).toBe(0);
    expect(await nextArrow.count()).toBe(0);
  });

  test('date shown as plain centered text — no calendar popover when noNav=1', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await expect(page.getByText(TODAY)).toBeVisible({ timeout: 6000 });
    // Calendar popover trigger button must not be visible
    await expect(page.locator('button[aria-label*="Open calendar"]')).not.toBeVisible();
  });

  test('normal date navigation works WITHOUT noNav (← button present)', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}`);
    await expect(page.getByText(TODAY)).toBeVisible({ timeout: 6000 });

    // ← navigation must be present (can always go back to a prior date)
    const prevArrow = page.getByRole('button').filter({ hasText: /←/ });
    await expect(prevArrow.first()).toBeVisible({ timeout: 5000 });
  });

  test('completed freestyle log is read-only — Day completed shown, Add Food disabled', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(2000);

    await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible({ timeout: 8000 });
    const addFoodBtns = page.getByRole('button', { name: /\+ add food/i });
    const btnCount = await addFoodBtns.count();
    for (let i = 0; i < btnCount; i++) {
      await expect(addFoodBtns.nth(i)).toBeDisabled();
    }
  });

  test('incomplete freestyle log is editable — Add Food and Mark day complete visible', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(2000);

    await expect(page.getByRole('button', { name: /\+ add food/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /mark day complete/i })).toBeVisible();
  });

  test('Complete Day: Cancel dismisses dialog without completing', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /mark day complete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/mark today as complete/i)).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /mark day complete/i })).toBeVisible();
  });

  test('Complete Day: Submit marks day as completed', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /mark day complete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

    const confirmBtn = page.getByRole('button', { name: /mark all & submit|submit/i }).first();
    await confirmBtn.click();

    // Handle possible celebration dialog
    const doneBtn = page.getByRole('button', { name: /^done$/i });
    if (await doneBtn.isVisible({ timeout: 3500 }).catch(() => false)) {
      await doneBtn.click();
    }

    // Day should now be completed
    await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /day completed/i })).toBeDisabled();
  });
});

// ── Full lifecycle ────────────────────────────────────────────────────────────

test.describe('Owner: Freestyle lifecycle — landing card reflects log state', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('landing transitions: no log → incomplete log → completed log', async ({ page, request }) => {
    // 1. No log — neither Continue nor View button present
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();

    // 2. Incomplete log → Continue button
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 700 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });

    // 3. Completed log → View button, no Continue
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
  });

  test('Log Today button from landing navigates with noNav=1 and shows no arrows', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    // The freestyle card shows either "Log Today" (empty state) or "Log Today (Freestyle)" (light/full state).
    // Both navigate to the freestyle day view with noNav=1.
    const logBtn = page.getByRole('button', { name: /log today/i });
    await expect(logBtn.first()).toBeVisible({ timeout: 6000 });
    await logBtn.first().click();

    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });

    // Verify no date navigation arrows in the day view
    const prevArrow = page.getByRole('button').filter({ hasText: /←/ });
    const nextArrow = page.getByRole('button').filter({ hasText: /→/ });
    expect(await prevArrow.count()).toBe(0);
    expect(await nextArrow.count()).toBe(0);
  });
});
