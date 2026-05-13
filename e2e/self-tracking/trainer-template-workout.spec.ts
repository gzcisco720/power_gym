import { test, expect } from '@playwright/test';

// Verifies the template workout flow via the cockpit landing, plus the
// "Save as template" finish-dialog option.
//
// What this test covers end-to-end:
//   1. Trainer navigates to /trainer/my-training and expands "E2E Test Plan"
//      in the template accordion (always visible when templates exist).
//   2. Clicks "Log" on Day 1 (Push) → POST /api/me/workout-logs → redirect to /session/[id]
//   3. Session page loads with heading "Push"
//   4. Trainer clicks Finish → CompleteWorkoutDialog opens
//   5. Checks "Save as template", fills in template name
//   6. Clicks "Finish workout" → saves template + redirects to my-training
//   7. Verifies the new template exists via GET /api/plan-templates

test.use({ storageState: 'e2e/.auth/trainer.json' });

// Use a unique name per run so concurrent / repeated runs don't collide.
const SAVED_TEMPLATE_NAME = `My Push Template ${Date.now()}`;

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

test.describe('trainer template workout + saveAsTemplate', () => {
  let savedTemplateId: string | null = null;

  test.beforeEach(async ({ request }) => {
    // Clear any active or completed-today logs so DAY_ALREADY_LOGGED is never hit.
    await clearTodayLogs(request);
  });

  test.afterEach(async ({ request }) => {
    // Clean up any logs created during the test.
    await clearTodayLogs(request);
  });

  test.afterAll(async ({ request }) => {
    // Clean up the template created by "Save as template" so the DB stays tidy.
    if (savedTemplateId) {
      await request.delete(`/api/plan-templates/${savedTemplateId}`);
    }
  });

  test('pick template day, finish workout with saveAsTemplate, verify template created', async ({
    page,
    request,
  }) => {
    // Suppress stray alert/confirm dialogs.
    page.on('dialog', (d) => {
      void d.dismiss();
    });

    await page.goto('/trainer/my-training');

    // --- Step 1: expand the E2E Test Plan in the template accordion ---
    const templateRow = page.getByRole('button', { name: /E2E Test Plan/i });
    await expect(templateRow).toBeVisible();
    await templateRow.click();

    // --- Step 2: click Log on the first day (Push / Day 1) ---
    await expect(page.getByRole('button', { name: /^Log$/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Log$/i }).first().click();

    // --- Step 3: redirect to session page ---
    await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);

    // Session page renders <h1>{log.dayName}</h1> which is the day name "Push".
    await expect(page.getByRole('heading', { name: /^push$/i })).toBeVisible();

    // --- Step 5: open the Finish dialog ---
    await page.getByRole('button', { name: /^finish$/i }).click();
    await expect(page.getByRole('heading', { name: /finish workout/i })).toBeVisible();

    // --- Step 6: toggle "Save as template" checkbox ---
    const saveCheckbox = page.getByRole('checkbox');
    await saveCheckbox.check();
    // After checking, a text input with aria-label "Template name" appears.
    const templateNameInput = page.getByLabel(/^template name$/i);
    await expect(templateNameInput).toBeVisible();
    await templateNameInput.fill(SAVED_TEMPLATE_NAME);

    // --- Step 7: submit ---
    await page.getByRole('button', { name: /^finish workout$/i }).click();

    // --- Step 8: redirected to my-training ---
    await page.waitForURL(/\/trainer\/my-training$/);
    await expect(page.getByRole('heading', { name: /my training/i })).toBeVisible();

    // --- Step 9: verify the saved template exists ---
    const listRes = await request.get('/api/plan-templates');
    expect(listRes.ok()).toBe(true);
    const list = (await listRes.json()) as { name: string; _id: string }[];
    const found = list.find((t) => t.name === SAVED_TEMPLATE_NAME);
    expect(found).toBeDefined();
    // Capture the ID for afterAll cleanup.
    if (found) savedTemplateId = found._id;
  });
});
