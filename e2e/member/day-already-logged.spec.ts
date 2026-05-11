import { test, expect } from '@playwright/test';

// Tests for the DAY_ALREADY_LOGGED conflict path on the member /member/plan page.
//
// Seed invariant (e2e/seed.ts): the member already has a completed workout
// session for today (dayNumber 1, "Push"). This means clicking "Log This
// Workout" always triggers the 409 DAY_ALREADY_LOGGED path — no per-test
// seeding required.

test.use({ storageState: 'e2e/.auth/member.json' });

interface WorkoutSession {
  _id: string;
  dayName: string;
  memberPlanId: string;
  completedAt: string | null;
}

interface PostSessionResult {
  error?: string;
  session?: { _id: string; dayName: string };
}

test.describe('Member: DAY_ALREADY_LOGGED conflict flow', () => {
  test('clicking "Log This Workout" shows "Already trained today" dialog; Got it closes it', async ({
    page,
  }) => {
    await page.goto('/member/plan');

    // Click the "Log This Workout" button — triggers DAY_ALREADY_LOGGED 409.
    await page.getByRole('button', { name: /log this workout/i }).click();

    // Dialog must appear with the correct title.
    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();

    // "View session →" link is visible.
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

  test('(API) POST /api/sessions returns 409 DAY_ALREADY_LOGGED when today is logged', async ({
    request,
  }) => {
    // Get a valid memberPlanId from existing sessions.
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    expect(sessionsRes.ok()).toBe(true);
    const sessions = (await sessionsRes.json()) as WorkoutSession[];
    const existing = sessions.find((s) => s.memberPlanId);
    const memberPlanId = existing?.memberPlanId ?? 'placeholder';

    // Today's session is already completed (seeded). Posting again must fail.
    const res = await request.post('/api/sessions', {
      data: { memberPlanId, dayNumber: 1 },
    });

    expect(res.status()).toBe(409);
    const body = (await res.json()) as PostSessionResult;
    expect(body.error).toBe('DAY_ALREADY_LOGGED');
    expect(body.session?._id).toBeTruthy();
  });
});
