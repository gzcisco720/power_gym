import { test, expect } from '@playwright/test';

// Tests for the DAY_ALREADY_LOGGED conflict path:
//   - Attempting to start a blank session when a completed log exists today
//     triggers the "Already trained today" dialog in the UI.
//   - Same dialog appears when clicking "Log" on a template day.
//   - The raw API returns 409 with error: 'DAY_ALREADY_LOGGED'.
//
// Seed invariant: owner has an "E2E Owner Plan" template (created by e2e/seed.ts).
// Each test that needs UI dialog state seeds a completed log in beforeEach,
// and tears it down in afterEach, keeping the DB clean across runs.

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
    // Ensure no active log first so POST doesn't hit ACTIVE_SESSION_EXISTS.
    await clearActive(request);

    // Create + immediately complete a freestyle log for today.
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
    if (seededLogId) {
      await request.delete(`/api/me/workout-logs/${seededLogId}`);
      seededLogId = null;
    }
  });

  test('Test A — Start blank → shows "Already trained today" dialog; Got it closes it', async ({
    page,
  }) => {
    await page.goto('/owner/my-training');

    // Click the freestyle "Start blank →" button.
    await page.getByRole('button', { name: /^Start blank →$/i }).click();

    // Dialog must appear with the correct title.
    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();

    // "View session →" link points to the completed session.
    const viewLink = page.getByRole('link', { name: /View session →/i });
    await expect(viewLink).toBeVisible();

    // "Got it" button is visible.
    const gotItBtn = page.getByRole('button', { name: /Got it/i });
    await expect(gotItBtn).toBeVisible();

    // Clicking "Got it" closes the dialog.
    await gotItBtn.click();
    await expect(page.getByRole('heading', { name: /Already trained today/i })).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('Test B — Clicking Log on a template day shows "Already trained today" dialog', async ({
    page,
    request,
  }) => {
    // Verify the owner has at least one template; skip if not (defensive).
    const tplRes = await request.get('/api/plan-templates');
    const templates = (await tplRes.json()) as Array<{ _id: string; name: string }>;
    const ownerPlan = templates.find((t) => t.name === 'E2E Owner Plan');
    if (!ownerPlan) {
      test.skip();
      return;
    }

    await page.goto('/owner/my-training');

    // Expand the "E2E Owner Plan" accordion in the TemplatePathCard.
    const accordionBtn = page.getByRole('button', { name: /E2E Owner Plan/i });
    await expect(accordionBtn).toBeVisible();
    await accordionBtn.click();

    // Click the first "Log" button inside the expanded days list.
    const logBtn = page.getByRole('button', { name: /^Log$/i }).first();
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    // The same "Already trained today" dialog must appear.
    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();

    // Both action elements are present.
    await expect(page.getByRole('link', { name: /View session →/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Got it/i })).toBeVisible();
  });

  test('Test C (API) — POST /api/me/workout-logs returns 409 DAY_ALREADY_LOGGED when today is logged', async ({
    request,
  }) => {
    // Completed log already exists (seeded in beforeEach). Posting again must fail.
    const res = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle 2', plannedSets: [] },
    });

    expect(res.status()).toBe(409);
    const body = (await res.json()) as PostResult;
    expect(body.error).toBe('DAY_ALREADY_LOGGED');
    expect(body.session?._id).toBeTruthy();
  });
});
