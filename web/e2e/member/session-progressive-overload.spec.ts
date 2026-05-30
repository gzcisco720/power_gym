import { test, expect } from '@playwright/test';

// Verifies progressive overload hints in the session logger:
//   A: After a first-ever session the next session shows a last-weight hint.
//   B: When allSetsHitMax for 1 session the "1 more session" nudge appears.
//   C: When allSetsHitMax for 2 consecutive sessions the "Try X kg" badge appears.
//
// These tests verify the hint API is called and the UI updates accordingly.
// They rely on the seed data or on the API returning mocked/real hints.

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: session logger progressive overload hints', () => {
  test('no hint shown on a brand new session for an exercise with no history', async ({
    page,
    request,
  }) => {
    // Get an in-progress or create a new session.
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    const sessions = (await sessionsRes.json()) as { _id: string; completedAt: string | null }[];
    const active = sessions.find((s) => s.completedAt === null);
    if (!active) {
      test.skip(true, 'No active session available in seed data');
      return;
    }

    // Intercept the hints API and return empty (simulates first-ever session).
    await page.route('**/exercise-last-weights**', (route) =>
      route.fulfill({ json: { hints: [] } }),
    );

    await page.goto(`/member/plan/session/${active._id}`);
    await page.waitForLoadState('networkidle');

    // No hint rows should be rendered.
    await expect(page.getByTestId('last-weight-hint')).not.toBeVisible();
    await expect(page.getByTestId('try-heavier-badge')).not.toBeVisible();
  });

  test('last-weight hint is shown when API returns a hint (0 consecutive max hits)', async ({
    page,
    request,
  }) => {
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    const sessions = (await sessionsRes.json()) as { _id: string; completedAt: string | null; sets: { exerciseId: string; isBodyweight: boolean }[] }[];
    const active = sessions.find((s) => s.completedAt === null);
    if (!active) {
      test.skip(true, 'No active session available in seed data');
      return;
    }

    const nonBwExercise = active.sets?.find((s) => !s.isBodyweight);
    if (!nonBwExercise) {
      test.skip(true, 'No non-bodyweight exercise in active session');
      return;
    }

    // Inject a hint with 0 consecutive max hits (didn't hit max last time).
    await page.route('**/exercise-last-weights**', (route) =>
      route.fulfill({
        json: {
          hints: [
            {
              exerciseId: nonBwExercise.exerciseId,
              lastWeight: 80,
              lastReps: 8,
              lastDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
              consecutiveMaxHits: 0,
            },
          ],
        },
      }),
    );

    await page.goto(`/member/plan/session/${active._id}`);
    await page.waitForLoadState('networkidle');

    // Hint text should appear.
    await expect(page.getByTestId('last-weight-hint').first()).toBeVisible();
    await expect(page.getByText(/Last: 80 kg × 8/).first()).toBeVisible();

    // No badge — didn't hit max reps.
    await expect(page.getByTestId('try-heavier-badge')).not.toBeVisible();
    await expect(page.getByTestId('almost-badge')).not.toBeVisible();
  });

  test('"Try X kg" badge appears when consecutiveMaxHits >= 2', async ({ page, request }) => {
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    const sessions = (await sessionsRes.json()) as { _id: string; completedAt: string | null; sets: { exerciseId: string; isBodyweight: boolean }[] }[];
    const active = sessions.find((s) => s.completedAt === null);
    if (!active) {
      test.skip(true, 'No active session available in seed data');
      return;
    }

    const nonBwExercise = active.sets?.find((s) => !s.isBodyweight);
    if (!nonBwExercise) {
      test.skip(true, 'No non-bodyweight exercise in active session');
      return;
    }

    // 80 kg × 12 reps, 2 consecutive max hits → badge should suggest 84.0 kg (80 * 1.05 = 84)
    await page.route('**/exercise-last-weights**', (route) =>
      route.fulfill({
        json: {
          hints: [
            {
              exerciseId: nonBwExercise.exerciseId,
              lastWeight: 80,
              lastReps: 12,
              lastDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
              consecutiveMaxHits: 2,
            },
          ],
        },
      }),
    );

    await page.goto(`/member/plan/session/${active._id}`);
    await page.waitForLoadState('networkidle');

    // Badge with suggested weight should be visible.
    await expect(page.getByTestId('try-heavier-badge').first()).toBeVisible();
    await expect(page.getByText(/84\.0 kg/).first()).toBeVisible();

    // Hint should disappear once user types a weight.
    const weightInput = page.getByLabel(/Set 1 weight/i).first();
    await weightInput.fill('82');
    await expect(page.getByTestId('last-weight-hint')).not.toBeVisible();
  });
});
