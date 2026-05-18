import { test, expect } from '@playwright/test';

// Tests for the DAY_ALREADY_LOGGED conflict path on the member /member/plan page.
//
// Seed invariant (e2e/seed.ts): the member already has a completed workout
// session for today (dayNumber 1, "Push"). This means clicking "Log This
// Workout" always triggers the 409 DAY_ALREADY_LOGGED path — no per-test
// seeding required.
//
// Note: the member plan DayAlreadyLoggedDialog does NOT expose "Delete previous
// log" — that option is only available on self-tracking (My Training) pages.

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
  test('clicking "Log This Workout" shows "Already trained today" dialog', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('button', { name: /log this workout/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(page.getByText(/completed your/i)).toBeVisible();
  });

  test('"View session →" link and "Got it" button are both present in the dialog', async ({
    page,
  }) => {
    await page.goto('/member/plan');
    await page.getByRole('button', { name: /log this workout/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View session →/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Got it/i })).toBeVisible();
  });

  test('"Got it" closes the dialog', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('button', { name: /log this workout/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await page.getByRole('button', { name: /Got it/i }).click();
    await expect(
      page.getByRole('heading', { name: /Already trained today/i }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('"Delete previous log" option is NOT shown for member plan sessions', async ({ page }) => {
    // The member plan uses DayAlreadyLoggedDialog without onDeleteLog,
    // so this destructive option must not be present.
    await page.goto('/member/plan');
    await page.getByRole('button', { name: /log this workout/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /delete previous log/i }),
    ).not.toBeVisible();
  });

  test('"View session →" link points to the completed session', async ({ page }) => {
    await page.goto('/member/plan');
    await page.getByRole('button', { name: /log this workout/i }).click();

    await expect(page.getByRole('heading', { name: /Already trained today/i })).toBeVisible();
    const viewLink = page.getByRole('link', { name: /View session →/i });
    const href = await viewLink.getAttribute('href');
    expect(href).toMatch(/\/member\/plan\/session\//);
  });

  test('(API) POST /api/sessions returns 409 DAY_ALREADY_LOGGED when today is logged', async ({
    request,
  }) => {
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    expect(sessionsRes.ok()).toBe(true);
    const sessions = (await sessionsRes.json()) as WorkoutSession[];
    const existing = sessions.find((s) => s.memberPlanId);
    const memberPlanId = existing?.memberPlanId ?? 'placeholder';

    const res = await request.post('/api/sessions', {
      data: { memberPlanId, dayNumber: 1 },
    });

    expect(res.status()).toBe(409);
    const body = (await res.json()) as PostSessionResult;
    expect(body.error).toBe('DAY_ALREADY_LOGGED');
    expect(body.session?._id).toBeTruthy();
  });
});
