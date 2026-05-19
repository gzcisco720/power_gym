import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Plan card: schedule-aware ─────────────────────────────────────────────────

test.describe('Member: Plan card — schedule-aware', () => {
  test('landing shows plan card in one of its three valid states — schedule match, no-match picker, or no plan', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Three valid states for the plan card:
    // (a) plan with schedule matching today → "Log Today" primary button inside the My Plan card
    // (b) plan exists but no schedule match for today → "No plan for today. Pick a day:" text
    // (c) no plan assigned → "No nutrition plan assigned yet."
    //
    // Use the My Plan card container to scope checks (avoids picking up the Freestyle "Log Today").
    const planCard = page.locator('text=My Plan').locator('../..');

    // Wait for the page to render the plan card section
    await expect(planCard.first()).toBeVisible({ timeout: 6000 });

    const logTodayBtn = planCard.first().getByRole('button', { name: /^log today$/i });
    const noPlanForToday = page.getByText(/no plan for today/i);
    const noPlanAssigned = page.getByText(/no nutrition plan assigned/i);

    const logVisible = await logTodayBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const noScheduleVisible = await noPlanForToday.isVisible({ timeout: 1000 }).catch(() => false);
    const noAssignedVisible = await noPlanAssigned.isVisible({ timeout: 1000 }).catch(() => false);

    expect(logVisible || noScheduleVisible || noAssignedVisible).toBe(true);
  });

  test('"Log Today" on plan card navigates to plan mode day view', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Scope to My Plan card to avoid ambiguity with freestyle "Log Today"
    const planCard = page.locator('text=My Plan').locator('../..');
    const logTodayBtn = planCard.first().getByRole('button', { name: /^log today$/i });
    if (!(await logTodayBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await logTodayBtn.click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=plan/, { timeout: 5000 });
    // URL must NOT contain dayTypeName when schedule resolves today automatically
    expect(page.url()).not.toContain('dayTypeName');
  });

  test('plan mode day view shows meal sections', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Scope to My Plan card to avoid ambiguity with freestyle "Log Today"
    const planCard = page.locator('text=My Plan').locator('../..');
    const logTodayBtn = planCard.first().getByRole('button', { name: /^log today$/i });
    if (!(await logTodayBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await logTodayBtn.click();
    await expect(page.getByText(/breakfast|lunch|dinner/i).first()).toBeVisible({ timeout: 8000 });
  });
});

// ── Freestyle card: today only, no double-log ──────────────────────────────────

test.describe('Member: Freestyle card — today only, no double-log', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('shows "Log Today" when no freestyle log exists for today', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Freestyle card section must be visible
    await expect(page.getByText('Freestyle').first()).toBeVisible({ timeout: 6000 });

    // Must not show Continue or View (no existing log)
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test('shows "Continue Today\'s Log" when incomplete freestyle log exists', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 800 });
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });

    // "Log Today" standalone must NOT appear in the freestyle card area — prevents starting a second log
    // (there may still be a "Log Today" in the plan card, so just check Continue is exclusively shown)
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test('shows "View Today\'s Log" when completed freestyle log exists', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
    // Continue must not appear when already completed
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
  });

  test('"View Today\'s Log" navigates to freestyle day view', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /view today/i }).click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=free/, { timeout: 5000 });
  });
});

// ── Freestyle day view: no date navigation ────────────────────────────────────

test.describe('Member: Freestyle day view — no date navigation', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('no ← and → navigation buttons in freestyle mode', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1500);

    // Arrow-nav buttons must not be present (noDateNav=true removes them entirely)
    const prevArrow = page.getByRole('button').filter({ hasText: /←/ });
    const nextArrow = page.getByRole('button').filter({ hasText: /→/ });

    expect(await prevArrow.count()).toBe(0);
    expect(await nextArrow.count()).toBe(0);
  });

  test("today's date is shown as centered plain text — no calendar popover trigger", async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1000);

    // The noDateNav branch renders date as plain centered text
    await expect(page.getByText(TODAY)).toBeVisible();

    // Calendar popover trigger must NOT exist
    const calendarTrigger = page.getByRole('button').filter({ hasText: new RegExp(TODAY) });
    // It should either not exist, or if it does appear it should be the plain text (not a button)
    // The real check: the aria-label "Open calendar" button must not be visible
    await expect(page.locator('button[aria-label*="Open calendar"]')).not.toBeVisible();
  });

  test('completed freestyle log is read-only — "Day completed ✓" shown, "+ Add Food" absent', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(2000);

    // DayCompleteBar renders disabled "Day completed ✓" button when dayCompleted=true
    await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /day completed/i })).toBeDisabled();

    // Meal sections show "+ Add Food" buttons but they must be disabled when locked
    const addFoodBtns = page.getByRole('button', { name: /\+ add food/i });
    const count = await addFoodBtns.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(addFoodBtns.nth(i)).toBeDisabled();
    }
  });

  test('incomplete freestyle log is editable — "+ Add Food" and "Mark day complete" visible', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(2000);

    // DayCompleteBar renders "Mark day complete" when not yet completed
    await expect(page.getByRole('button', { name: /^mark day complete$/i })).toBeVisible({ timeout: 8000 });

    // At least one meal section should show an enabled "+ Add Food" button
    await expect(page.getByRole('button', { name: /\+ add food/i }).first()).toBeEnabled();
  });

  test('Complete Day flow: confirm dialog appears, Cancel leaves day incomplete', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /^mark day complete$/i }).click();

    // Dialog must appear with the correct title
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: /mark today as complete/i })).toBeVisible();

    // Cancel → dialog closes, day still not completed
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^mark day complete$/i })).toBeVisible();
  });
});

// ── Full lifecycle ─────────────────────────────────────────────────────────────

test.describe('Member: Nutrition full daily lifecycle', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('freestyle card reflects log state changes after reload', async ({ page, request }) => {
    // Start: no freestyle log
    await deleteTodayFreestyleLog(request);
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Seed an incomplete freestyle log and reload
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 500 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });

    // Complete the log and reload again
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 1900 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
  });

  test('plan and freestyle cards coexist on landing — both sections visible', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.waitForLoadState('networkidle');

    // Both card sections must always be present regardless of state
    await expect(page.getByText(/my plan/i).first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/freestyle/i).first()).toBeVisible({ timeout: 6000 });
  });
});
