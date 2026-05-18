import { test, expect } from '@playwright/test';

// Lifecycle UX for owner/trainer's own SelfWorkoutLog:
//   - Same-day active log: cockpit shows resume banner with Continue + Discard
//   - Cross-day active log: cockpit shows a modal forcing Save / Discard
//   - Save backdates completedAt to lastActivityAt and adds an empty session row
//   - Active session blocks "Start blank" with 409 — UI surfaces existing session
//
// New logging UX (batch-save at submit time):
//   - No per-set ✓ button; all sets saved in batch when Finish is clicked
//   - Finish is blocked (toast) when exercises exist but nothing is filled
//   - Partial fills (one of weight/reps empty) are blocked with red borders
//   - Empty sets are skipped; only filled sets are PATCHed
//   - Full completion: fill sets → Finish → animation → Finish Workout → redirect
//
// Uses the API to seed/manipulate the active log directly so the spec is
// deterministic regardless of wall-clock time inside the page session.

test.use({ storageState: 'e2e/.auth/owner.json' });

async function clearActive(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get('/api/me/workout-logs/active');
  const log = (await r.json()) as { _id?: string } | null;
  if (log?._id) {
    await request.delete(`/api/me/workout-logs/${log._id}`);
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

test.describe('owner: my-training session lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await clearActive(request);
  });

  test.afterEach(async ({ request }) => {
    await clearActive(request);
  });

  // ── Banner / resume ──────────────────────────────────────────────────────

  test('same-day active log surfaces a resume banner; Continue → session', async ({
    page,
    request,
  }) => {
    const create = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    expect(create.ok()).toBe(true);

    await page.goto('/owner/my-training');
    await expect(page.getByText(/Freestyle session in progress/i)).toBeVisible();
    const continueLink = page.getByRole('link', { name: /continue/i });
    await expect(continueLink).toBeVisible();
    await continueLink.click();

    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();
  });

  test('same-day banner Discard removes the active log', async ({ page, request }) => {
    await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });

    await page.goto('/owner/my-training');
    await expect(page.getByText(/Freestyle session in progress/i)).toBeVisible();

    await page.getByRole('button', { name: /discard active session/i }).click();
    await expect(
      page.getByText(/Freestyle session in progress/i),
    ).not.toBeVisible({ timeout: 5000 });

    const r = await request.get('/api/me/workout-logs/active');
    expect(await r.json()).toBeNull();
  });

  test('cross-day modal forces Save / Discard; Save seals the log', async ({
    page,
    request,
  }) => {
    const create = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    const created = (await create.json()) as { _id: string };

    await page.addInitScript(`{
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(RealDate.now() + 86400000);
          } else {
            super(...args);
          }
        }
        static now() { return RealDate.now() + 86400000; }
      }
      Date = MockDate;
    }`);

    await page.goto('/owner/my-training');
    await expect(page.getByText(/Unfinished workout from/i)).toBeVisible();

    const saveBtn = page.getByRole('button', { name: /save it/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(page.getByText(/Unfinished workout from/i)).not.toBeVisible({ timeout: 8000 });

    const r = await request.get(`/api/me/workout-logs/${created._id}`);
    const log = (await r.json()) as { completedAt: string | null; autoSealed: boolean };
    expect(log.completedAt).not.toBeNull();
    expect(log.autoSealed).toBe(false);
  });

  test('starting a new blank session is blocked while active log exists (409)', async ({
    request,
  }) => {
    await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });

    const second = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle 2', plannedSets: [] },
    });
    expect(second.status()).toBe(409);
    const body = (await second.json()) as {
      error: string;
      activeSession: { _id: string; dayName: string; setCount: number };
    };
    expect(body.error).toBe('ACTIVE_SESSION_EXISTS');
    expect(body.activeSession.dayName).toBe('Freestyle');
  });

  // ── New logging UX: submit-time validation ───────────────────────────────

  test('Finish is blocked with toast when exercises added but all inputs empty', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);

    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await expect(page.getByRole('heading', { name: /select exercise/i })).toBeVisible();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByText(/fill in at least one set/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /finish workout/i })).not.toBeVisible();
  });

  test('Finish blocked with red border on reps input when only weight is filled', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);

    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();

    await page.getByLabel('Set 1 weight').fill('100');
    await page.getByRole('button', { name: /^finish$/i }).click();

    await expect(page.getByRole('heading', { name: /finish workout/i })).not.toBeVisible();
    await expect(page.getByLabel('Set 1 reps')).toHaveClass(/ring-destructive/);
  });

  // ── New logging UX: full golden path ────────────────────────────────────

  test('fills sets → Finish → animation → Finish Workout → redirects + session complete', async ({
    page,
    request,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);
    const logId = page.url().split('/').pop()!;

    // Add Bench Press and fill the single set
    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await expect(page.getByRole('heading', { name: /select exercise/i })).toBeVisible();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByText('Bench Press').first()).toBeVisible();

    await page.getByLabel('Set 1 weight').fill('100');
    await page.getByLabel('Set 1 reps').fill('5');
    await expect(page.getByText(/1 \/ 1 sets filled/)).toBeVisible();

    // Finish → PATCH sets → animation plays → form appears
    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });

    // Fill in RPE before confirming
    const rpeInput = page.getByLabel(/rpe/i);
    if (await rpeInput.isVisible()) {
      await rpeInput.fill('8');
    }

    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/owner\/my-training$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /^my training$/i })).toBeVisible();

    // Verify via API that the log is complete with the saved set data
    const logRes = await request.get(`/api/me/workout-logs/${logId}`);
    expect(logRes.ok()).toBe(true);
    const log = (await logRes.json()) as {
      completedAt: string | null;
      rpe: number | null;
      sets: Array<{ actualWeight: number | null; actualReps: number | null; completedAt: string | null }>;
    };
    expect(log.completedAt).not.toBeNull();
    expect(log.rpe).toBe(8);
    const saved = log.sets.filter((s) => s.completedAt !== null);
    expect(saved).toHaveLength(1);
    expect(saved[0].actualWeight).toBe(100);
    expect(saved[0].actualReps).toBe(5);
  });

  test('X button removes set row; deleted set is not saved on completion', async ({
    page,
    request,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);
    const logId = page.url().split('/').pop()!;

    await page.getByRole('button', { name: /\+ add exercise/i }).click();
    await page.getByRole('button', { name: /^bench press/i }).first().click();
    await expect(page.getByLabel('Set 1 weight')).toBeVisible();

    // Add a second set, fill it
    await page.getByRole('button', { name: /\+ add set/i }).click();
    await expect(page.getByLabel('Set 2 weight')).toBeVisible();

    await page.getByLabel('Set 1 weight').fill('80');
    await page.getByLabel('Set 1 reps').fill('8');
    await page.getByLabel('Set 2 weight').fill('80');
    await page.getByLabel('Set 2 reps').fill('8');

    // Delete set 2
    await page.getByRole('button', { name: 'Delete set 2' }).click();
    await expect(page.getByLabel('Set 2 weight')).not.toBeVisible();

    // Complete
    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/owner\/my-training$/);

    // Only 1 set should be saved (set 2 was deleted)
    const logRes = await request.get(`/api/me/workout-logs/${logId}`);
    const log = (await logRes.json()) as {
      sets: Array<{ completedAt: string | null }>;
    };
    const saved = log.sets.filter((s) => s.completedAt !== null);
    expect(saved).toHaveLength(1);
  });

  test('empty session (no exercises) completes without "fill a set" toast', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);

    await page.getByRole('button', { name: /^finish$/i }).click();

    // No exercises → no hasAnyData check → dialog opens directly
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /^finish workout$/i }).click();
    await page.waitForURL(/\/owner\/my-training$/);
  });
});
