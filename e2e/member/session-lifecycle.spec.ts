import { test, expect } from '@playwright/test';

// Lifecycle UX for member's WorkoutSession on /member/plan:
//   - Same-day active session: resume banner + Discard
//   - Cross-day active session: modal forcing Save / Discard
//   - Save backdates completedAt = lastActivityAt so duration is meaningful

test.use({ storageState: 'e2e/.auth/member.json' });

async function clearActiveMemberSessions(
  request: import('@playwright/test').APIRequestContext,
) {
  // Delete active sessions
  const r = await request.get('/api/sessions?memberId=me');
  const sessions = (await r.json()) as { _id: string; completedAt: string | null }[];
  for (const s of sessions) {
    if (s.completedAt == null) {
      await request.delete(`/api/sessions/${s._id}`);
    }
  }
  // Also delete today's completed sessions so DAY_ALREADY_LOGGED is never hit
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const rangeRes = await request.get(
    `/api/sessions?memberId=me&start=${today.toISOString()}&end=${tomorrow.toISOString()}`,
  );
  if (rangeRes.ok()) {
    const todaySessions = (await rangeRes.json()) as Array<{ _id: string }>;
    await Promise.all(todaySessions.map((s) => request.delete(`/api/sessions/${s._id}`)));
  }
}

test.describe('member: plan session lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await clearActiveMemberSessions(request);
  });

  test.afterEach(async ({ request }) => {
    await clearActiveMemberSessions(request);
  });

  test('same-day active session shows resume banner with Continue + Discard', async ({ page, request }) => {
    // Member uses /api/sessions to create an active session against their plan.
    const planRes = await request.get('/api/members/me/plan');
    const plan = (await planRes.json()) as { _id: string };
    const create = await request.post('/api/sessions', {
      data: { memberPlanId: plan._id, dayNumber: 1 },
    });
    expect(create.ok()).toBe(true);

    await page.goto('/member/plan');

    await expect(page.getByText(/Push session in progress/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /continue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /discard active session/i })).toBeVisible();
  });

  test('same-day Discard removes the active session', async ({ page, request }) => {
    const planRes = await request.get('/api/members/me/plan');
    const plan = (await planRes.json()) as { _id: string };
    await request.post('/api/sessions', {
      data: { memberPlanId: plan._id, dayNumber: 1 },
    });

    await page.goto('/member/plan');
    await expect(page.getByText(/Push session in progress/i)).toBeVisible();

    await page.getByRole('button', { name: /discard active session/i }).click();
    await expect(page.getByText(/Push session in progress/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('cross-day active session forces Save / Discard via modal; Save seals it', async ({ page, request }) => {
    const planRes = await request.get('/api/members/me/plan');
    const plan = (await planRes.json()) as { _id: string };
    const create = await request.post('/api/sessions', {
      data: { memberPlanId: plan._id, dayNumber: 1 },
    });
    const session = (await create.json()) as { _id: string };

    // Tomorrow-shifted Date in the browser triggers the cross-day branch.
    await page.addInitScript(`{
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(RealDate.now() + 86400000);
          else super(...args);
        }
        static now() { return RealDate.now() + 86400000; }
      }
      globalThis.Date = MockDate;
    }`);

    await page.goto('/member/plan');

    await expect(page.getByText(/Unfinished workout from/i)).toBeVisible();
    await page.getByRole('button', { name: /save it/i }).click();

    await expect(page.getByText(/Unfinished workout from/i)).not.toBeVisible({ timeout: 8000 });

    const after = await request.get(`/api/sessions/${session._id}`);
    const body = (await after.json()) as { completedAt: string | null; autoSealed: boolean };
    expect(body.completedAt).not.toBeNull();
    expect(body.autoSealed).toBe(false);
  });
});
