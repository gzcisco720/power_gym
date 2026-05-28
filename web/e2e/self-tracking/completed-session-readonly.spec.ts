import { test, expect } from '@playwright/test';

// Verifies that the session page is read-only when the log is completed:
//   - The page loads with the log's dayName as the heading.
//   - No "Finish" button is visible (only present for in-progress sessions).
//   - A static duration/completed summary is shown instead of a live timer.
//   - No "Start blank →" or "Start" button is present on the session page.

test.use({ storageState: 'e2e/.auth/owner.json' });

interface WorkoutLogResponse {
  _id: string;
  dayName: string;
}

async function clearActive(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get('/api/me/workout-logs/active');
  const log = (await r.json()) as { _id?: string } | null;
  if (log?._id) {
    await request.delete(`/api/me/workout-logs/${log._id}`);
  }
}

test.describe('completed session page is read-only', () => {
  let completedLogId: string | null = null;

  test.beforeEach(async ({ request }) => {
    // Ensure no active log before seeding so POST doesn't conflict.
    await clearActive(request);

    // Create a freestyle log and immediately complete it.
    const createRes = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    expect(createRes.ok()).toBe(true);
    const created = (await createRes.json()) as WorkoutLogResponse;
    completedLogId = created._id;

    const completeRes = await request.post(`/api/me/workout-logs/${created._id}/complete`, {
      data: { rpe: null, note: null },
    });
    expect(completeRes.ok()).toBe(true);
  });

  test.afterEach(async ({ request }) => {
    if (completedLogId) {
      await request.delete(`/api/me/workout-logs/${completedLogId}`);
      completedLogId = null;
    }
  });

  test('completed session page loads, has no Finish button, shows static summary', async ({
    page,
  }) => {
    expect(completedLogId).not.toBeNull();

    await page.goto(`/owner/my-training/session/${completedLogId}`);

    // Page heading matches the dayName ("Freestyle").
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();

    // No "Finish" button — it only appears for in-progress sessions.
    await expect(page.getByRole('button', { name: /^finish$/i })).not.toBeVisible();

    // Static duration/completed summary is rendered in the sticky footer.
    // The component renders: "Completed {date} · {sets} sets · {duration}"
    // For a session with no sets completed immediately, duration is "0m".
    // We match the word "Completed" which is only shown for completed logs.
    await expect(page.getByText(/Completed/i)).toBeVisible();

    // No "Start blank →" button — that only lives on the landing page.
    await expect(page.getByRole('button', { name: /Start blank/i })).not.toBeVisible();

    // No generic "Start" button on this page.
    await expect(page.getByRole('button', { name: /^start$/i })).not.toBeVisible();
  });
});
