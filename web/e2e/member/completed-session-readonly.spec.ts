import { test, expect } from '@playwright/test';

// Verifies that the member session page is read-only when the log is completed:
//   - The page loads with the session's dayName as the heading.
//   - No "Complete Workout" button is visible (only present for in-progress sessions).
//   - The static "Completed …" summary is shown in the sticky footer.
//   - No "+ Add Exercise" button is visible.
//
// Seed invariant (e2e/seed.ts): the member already has a completed workout
// session for today (dayNumber 1, "Push"). We fetch its ID via the API and
// navigate directly to the session page — no per-test seeding required.

test.use({ storageState: 'e2e/.auth/member.json' });

interface WorkoutSession {
  _id: string;
  dayName: string;
  completedAt: string | null;
}

test.describe('Member: completed session page is read-only', () => {
  test('completed session page loads, has no Complete Workout button, shows static summary', async ({
    page,
    request,
  }) => {
    // Fetch the member's sessions and pick the completed one from the seed.
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    expect(sessionsRes.ok()).toBe(true);
    const sessions = (await sessionsRes.json()) as WorkoutSession[];
    const completed = sessions.find((s) => s.completedAt !== null);
    expect(completed).toBeTruthy();
    const sessionId = completed!._id;

    await page.goto(`/member/plan/session/${sessionId}`);

    // Page heading matches the dayName ("Push").
    await expect(page.getByText(/^push$/i)).toBeVisible();

    // No "Complete Workout" button — it only appears for in-progress sessions.
    await expect(page.getByRole('button', { name: /Complete Workout/i })).not.toBeVisible();

    // Static completed summary is rendered in the sticky footer.
    // The component renders: "Completed {date} · {sets} sets · {duration}"
    // "Completed" only appears for completed sessions.
    await expect(page.getByText(/Completed/i)).toBeVisible();

    // No "+ Add Exercise" button — only shown for in-progress sessions.
    await expect(page.getByText(/\+ Add Exercise/i)).not.toBeVisible();
  });
});
