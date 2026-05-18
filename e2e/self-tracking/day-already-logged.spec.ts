import { test, expect } from '@playwright/test';

// Tests for the DAY_ALREADY_LOGGED conflict path:
//   - Attempting to start a blank or template session when a completed log
//     exists today shows the "Already trained today" dialog.
//   - The dialog includes a "Delete previous log" option that deletes the log
//     and closes the dialog with a success toast so the user can re-log.
//   - The raw API returns 409 with error: 'DAY_ALREADY_LOGGED'.
//
// Seed invariant: owner has an "E2E Owner Plan" template (created by e2e/seed.ts).
// Each UI test seeds a completed log in beforeEach and tears it down in afterEach.

test.use({ storageState: 'e2e/.auth/owner.json' });

interface WorkoutLogResponse {
  _id: string;
  dayName?: string;
}

interface PostResult {
  error?: string;
  session?: { _id: string; dayName: string };
}

async function clearActive(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get('/api/me/workout-logs/active');
  const log = (await r.json()) as { _id?: string } | null;
  if (log?._id) {
    await request.delete(`/api/me/workout-logs/${log._id}`);
  }
}

test.describe('DAY_ALREADY_LOGGED conflict flow', () => {
  let seededLogId: string | null = null;

  test.beforeEach(async ({ request }) => {
    await clearActive(request);

    const createRes = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    expect(createRes.ok()).toBe(true);
    const created = (await createRes.json()) as WorkoutLogResponse;
    seededLogId = created._id;

    const completeRes = await request.post(`/api/me/workout-logs/${created._id}/complete`, {
      data: { rpe: null, note: null },
    });
    expect(completeRes.ok()).toBe(true);
  });

  test.afterEach(async ({ request }) => {
    // Defensive cleanup — may already be deleted by "Delete previous log" tests.
    if (seededLogId) {
      await request.delete(`/api/me/workout-logs/${seededLogId}`).catch(() => {});
      seededLogId = null;
    }
  });

  // ── Dialog appearance ────────────────────────────────────────────────────

  test('Start blank → shows "Already trained today" dialog; Got it closes it', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View session →/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Got it/i })).toBeVisible();

    await page.getByRole('button', { name: /Got it/i }).click();
    await expect(
      page.getByRole('heading', { name: /Already trained today/i }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('Template Log → shows "Already trained today" dialog', async ({ page, request }) => {
    const tplRes = await request.get('/api/plan-templates');
    const templates = (await tplRes.json()) as Array<{ _id: string; name: string }>;
    const ownerPlan = templates.find((t) => t.name === 'E2E Owner Plan');
    if (!ownerPlan) { test.skip(); return; }

    await page.goto('/owner/my-training');
    const accordionBtn = page.getByRole('button', { name: /E2E Owner Plan/i });
    await expect(accordionBtn).toBeVisible();
    await accordionBtn.click();
    await page.getByRole('button', { name: /^Log$/i }).first().click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View session →/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Got it/i })).toBeVisible();
  });

  // ── Delete previous log ──────────────────────────────────────────────────

  test('"Delete previous log" button is visible in the dialog', async ({ page }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete previous log/i })).toBeVisible();
  });

  test('clicking "Delete previous log" closes the dialog and shows a success toast', async ({
    page,
    request,
  }) => {
    const logIdToDelete = seededLogId!;

    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();

    await page.getByRole('button', { name: /delete previous log/i }).click();

    // Dialog closes
    await expect(
      page.getByRole('heading', { name: /Already trained today/i }),
    ).not.toBeVisible({ timeout: 5000 });

    // Success toast
    await expect(page.getByText(/previous log deleted/i)).toBeVisible({ timeout: 5000 });

    // Log is actually deleted on the server
    const r = await request.get(`/api/me/workout-logs/${logIdToDelete}`);
    expect(r.status()).toBe(404);

    // Mark as cleaned up so afterEach doesn't re-attempt
    seededLogId = null;
  });

  test('after deleting, user can start a new session immediately', async ({ page }) => {
    await page.goto('/owner/my-training');
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();

    await page.getByRole('button', { name: /delete previous log/i }).click();
    await expect(
      page.getByRole('heading', { name: /Already trained today/i }),
    ).not.toBeVisible({ timeout: 5000 });

    // Click "Start blank →" again — should now navigate to a new session (no conflict)
    await page.getByRole('button', { name: /^Start blank →$/i }).click();
    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();

    seededLogId = null;
  });

  // ── API contract ─────────────────────────────────────────────────────────

  test('(API) POST /api/me/workout-logs returns 409 DAY_ALREADY_LOGGED when today is logged', async ({
    request,
  }) => {
    const res = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle 2', plannedSets: [] },
    });

    expect(res.status()).toBe(409);
    const body = (await res.json()) as PostResult;
    expect(body.error).toBe('DAY_ALREADY_LOGGED');
    expect(body.session?._id).toBeTruthy();
  });

  test('(API) DELETE /api/me/workout-logs/:id removes the log', async ({ request }) => {
    const res = await request.delete(`/api/me/workout-logs/${seededLogId}`);
    expect(res.status()).toBe(204);

    const getRes = await request.get(`/api/me/workout-logs/${seededLogId}`);
    expect(getRes.status()).toBe(404);

    seededLogId = null;
  });
});
