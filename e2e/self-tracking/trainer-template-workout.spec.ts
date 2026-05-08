import { test, expect } from '@playwright/test';

// Verifies the "From Template" workout flow plus "Save as template" on finish.
//
// What this test covers end-to-end:
//   1. Trainer navigates to /trainer/my-training
//   2. Clicks "From Template" → TemplateDayPickerDialog opens
//   3. Picks the seeded "E2E Test Plan" template → picks "Day 1 — Push"
//   4. POST /api/me/workout-logs → redirect to /session/[id]
//   5. Session page loads with heading "Push"
//   6. Trainer clicks Finish → CompleteWorkoutDialog opens
//   7. Checks "Save as template", fills in template name
//   8. Clicks "Finish workout" → saves template + redirects to calendar
//   9. Verifies the new template exists via GET /api/plan-templates

test.use({ storageState: 'e2e/.auth/trainer.json' });

// Use a unique name per run so concurrent / repeated runs don't collide.
const SAVED_TEMPLATE_NAME = `My Push Template ${Date.now()}`;

test.describe('trainer template workout + saveAsTemplate', () => {
  let savedTemplateId: string | null = null;

  test.beforeEach(async ({ request }) => {
    // If a previous test left an active log, delete it so the entry card shows
    // "From Template / Freestyle" rather than "Continue".
    const activeRes = await request.get('/api/me/workout-logs/active');
    const active = (await activeRes.json()) as { _id?: string } | null;
    if (active && active._id) {
      await request.delete(`/api/me/workout-logs/${active._id}`);
    }
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

    // --- Step 1: open the template picker ---
    const fromTemplateBtn = page.getByRole('button', { name: /^from template$/i });
    await expect(fromTemplateBtn).toBeVisible();
    await fromTemplateBtn.click();

    // --- Step 2: pick the seeded plan template ---
    // The dialog renders one ghost Button per template; the seed creates "E2E Test Plan".
    await expect(page.getByRole('button', { name: 'E2E Test Plan' })).toBeVisible();
    await page.getByRole('button', { name: 'E2E Test Plan' }).click();

    // --- Step 3: pick day 1 ---
    // After selecting the template the dialog lists day buttons: "Day 1 — Push"
    const day1Btn = page.getByRole('button', { name: /^Day 1 — Push$/i });
    await expect(day1Btn).toBeVisible();
    await day1Btn.click();

    // --- Step 4: redirect to session page ---
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

    // --- Step 8: redirected to calendar ---
    await page.waitForURL(/\/trainer\/my-training\/calendar/);
    await expect(page.getByRole('heading', { name: /training calendar/i })).toBeVisible();

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
