import { test, expect } from '@playwright/test';

// Verifies the freestyle (blank) workout flow for the new logging UX:
//   - No per-set ✓ button; sets are saved in batch at completion time
//   - X button deletes a set row from the UI
//   - Finish is blocked with a toast when exercises exist but nothing is filled
//   - Finish is blocked with a red border when only one of weight/reps is filled
//   - Empty session (no exercises added) can still be completed
//   - Filled session: PATCHes sets → animation → Finish Workout → redirect

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function clearTodayLogs(request: import('@playwright/test').APIRequestContext) {
  const activeRes = await request.get('/api/me/workout-logs/active');
  const active = (await activeRes.json()) as { _id?: string } | null;
  if (active?._id) {
    await request.delete(`/api/me/workout-logs/${active._id}`);
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const rangeRes = await request.get(
    `/api/me/workout-logs/range?start=${today.toISOString()}&end=${tomorrow.toISOString()}`,
  );
  if (rangeRes.ok()) {
    const logs = (await rangeRes.json()) as Array<{ _id: string }>;
    await Promise.all(logs.map((l) => request.delete(`/api/me/workout-logs/${l._id}`)));
  }
}

async function startBlankSession(page: import('@playwright/test').Page) {
  await page.goto('/trainer/my-training');
  const freestyleBtn = page.getByRole('button', { name: /start blank/i });
  await expect(freestyleBtn).toBeVisible();
  await freestyleBtn.click();
  await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);
  await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();
}

test.describe('trainer freestyle workout', () => {
  test.beforeEach(async ({ request }) => {
    await clearTodayLogs(request);
  });

  test.afterEach(async ({ request }) => {
    await clearTodayLogs(request);
  });

  // ── Empty session ────────────────────────────────────────────────────────

  test('finishes empty freestyle session (no exercises) and returns to my-training', async ({
    page,
  }) => {
    await startBlankSession(page);
    await expect(page.getByText(/no sets yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ add exercise/i })).toBeVisible();

    await page.getByRole('button', { name: /^finish$/i }).click();
    // No exercises → hasAnyData check skipped → dialog opens immediately
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /^finish workout$/i }).click();

    await page.waitForURL(/\/trainer\/my-training$/);
    await expect(page.getByRole('heading', { name: /^my training$/i })).toBeVisible();
  });

  // ── Session with exercises ───────────────────────────────────────────────

  test('Finish is blocked with toast when exercises exist but nothing is filled', async ({
    page,
  }) => {
    await startBlankSession(page);
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await expect(page.getByRole('heading', { name: /select exercise/i })).toBeVisible();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    // Click Finish without filling anything
    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByText(/fill in at least one set/i)).toBeVisible({ timeout: 5000 });
    // Dialog must NOT open
    await expect(page.getByRole('heading', { name: /finish workout/i })).not.toBeVisible();
  });

  test('Finish is blocked with red border when only weight is filled (reps missing)', async ({
    page,
  }) => {
    await startBlankSession(page);
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    await page.getByLabel('Set 1 weight').fill('60');
    // reps left empty
    await page.getByRole('button', { name: /^finish$/i }).click();

    await expect(page.getByRole('heading', { name: /finish workout/i })).not.toBeVisible();
    const repsInput = page.getByLabel('Set 1 reps');
    await expect(repsInput).toHaveClass(/ring-destructive/);
  });

  test('Finish is blocked with red border when only reps is filled (weight missing)', async ({
    page,
  }) => {
    await startBlankSession(page);
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    await page.getByLabel('Set 1 reps').fill('10');
    // weight left empty
    await page.getByRole('button', { name: /^finish$/i }).click();

    await expect(page.getByRole('heading', { name: /finish workout/i })).not.toBeVisible();
    const weightInput = page.getByLabel('Set 1 weight');
    await expect(weightInput).toHaveClass(/ring-destructive/);
  });

  test('X button removes that set row from the session', async ({ page }) => {
    await startBlankSession(page);
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    // One set row visible
    await expect(page.getByLabel('Set 1 weight')).toBeVisible();

    await page.getByRole('button', { name: 'Delete set 1' }).click();

    // Set row gone; only "No sets yet" remains in the footer
    await expect(page.getByLabel('Set 1 weight')).not.toBeVisible();
    await expect(page.getByText(/no sets yet/i)).toBeVisible();
  });

  test('picks an exercise, fills a set, and finishes — redirects and data saved via API', async ({
    page,
    request,
  }) => {
    await startBlankSession(page);

    // Capture the log ID from the URL for API verification later
    const sessionUrl = page.url();
    const logId = sessionUrl.split('/').pop()!;

    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await expect(page.getByRole('heading', { name: /select exercise/i })).toBeVisible();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    // Fill the set
    await page.getByLabel('Set 1 weight').fill('60');
    await page.getByLabel('Set 1 reps').fill('10');

    // Counter reflects the filled set
    await expect(page.getByText(/1 \/ 1 sets filled/)).toBeVisible();

    // Finish flow: Finish button → PATCH sets → animation → Finish workout → redirect
    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/trainer\/my-training$/);

    // API: verify the log is completed with the correct set data
    const logRes = await request.get(`/api/me/workout-logs/${logId}`);
    expect(logRes.ok()).toBe(true);
    const log = (await logRes.json()) as {
      completedAt: string | null;
      sets: Array<{ actualWeight: number | null; actualReps: number | null; completedAt: string | null }>;
    };
    expect(log.completedAt).not.toBeNull();
    const saved = log.sets.filter((s) => s.completedAt !== null);
    expect(saved).toHaveLength(1);
    expect(saved[0].actualWeight).toBe(60);
    expect(saved[0].actualReps).toBe(10);
  });

  test('filling partial sets and completing skips empty rows', async ({ page, request }) => {
    await startBlankSession(page);
    const logId = page.url().split('/').pop()!;

    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    // Add a second set
    await page.getByRole('button', { name: /\+ add set/i }).click();
    await expect(page.getByLabel('Set 2 weight')).toBeVisible();

    // Fill set 1, leave set 2 empty
    await page.getByLabel('Set 1 weight').fill('80');
    await page.getByLabel('Set 1 reps').fill('5');

    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/trainer\/my-training$/);

    const logRes = await request.get(`/api/me/workout-logs/${logId}`);
    const log = (await logRes.json()) as {
      sets: Array<{ actualWeight: number | null; completedAt: string | null }>;
    };
    const saved = log.sets.filter((s) => s.completedAt !== null);
    // Only the filled set was saved
    expect(saved).toHaveLength(1);
    expect(saved[0].actualWeight).toBe(80);
  });
});
