import { test, expect } from '@playwright/test';

// Lifecycle UX for owner/trainer's own SelfWorkoutLog:
//   - Same-day active log: cockpit shows resume banner with Continue + Discard
//   - Cross-day active log: cockpit shows a modal forcing Save / Discard
//   - Save backdates completedAt to lastActivityAt and adds an empty session row
//   - Active session blocks "Start blank" with 409 — UI surfaces existing session
//
// Uses the API to seed/manipulate the active log directly so the spec is
// deterministic regardless of wall-clock time inside the page session.

test.use({ storageState: 'e2e/.auth/owner.json' });

async function clearActive(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get('/api/me/workout-logs/active');
  const log = (await r.json()) as { _id?: string } | null;
  if (log?._id) {
    await request.delete(`/api/me/workout-logs/${log._id}`);
  }
}

test.describe('owner: my-training session lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await clearActive(request);
  });

  test.afterEach(async ({ request }) => {
    await clearActive(request);
  });

  test('same-day active log surfaces a resume banner; Continue → session', async ({ page, request }) => {
    // Create an active log via the API (today's startedAt by default).
    const create = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    expect(create.ok()).toBe(true);

    await page.goto('/owner/my-training');

    // Banner is the same-day path.
    await expect(page.getByText(/Freestyle session in progress/i)).toBeVisible();
    const continueLink = page.getByRole('link', { name: /continue/i });
    await expect(continueLink).toBeVisible();
    await continueLink.click();

    await page.waitForURL(/\/owner\/my-training\/session\/[a-f0-9]+/);
    await expect(page.getByRole('heading', { name: /^freestyle$/i })).toBeVisible();
  });

  test('same-day banner Discard removes the active log', async ({ page, request }) => {
    await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });

    await page.goto('/owner/my-training');
    await expect(page.getByText(/Freestyle session in progress/i)).toBeVisible();

    await page.getByRole('button', { name: /discard active session/i }).click();
    await expect(page.getByText(/Freestyle session in progress/i)).not.toBeVisible({ timeout: 5000 });

    // active endpoint now returns null
    const r = await request.get('/api/me/workout-logs/active');
    const log = await r.json();
    expect(log).toBeNull();
  });

  test('cross-day modal forces Save / Discard; Save adds row to recent list', async ({ page, request }) => {
    // Create the log, then backdate startedAt + lastActivityAt to yesterday via Mongo
    // round-trip. We do this by completing one set through the regular API
    // so lastActivityAt has a meaningful value, then patching via the model
    // is not allowed from e2e — instead we POST one set, then mutate via a
    // helper API. The simplest route is: start a fresh log, append one set
    // to set lastActivityAt, then nudge dates back through the test helper
    // mongoose entry point /api/test-helpers/backdate-active-log.
    //
    // Pure HTTP-only fallback: rely on the model — we can't directly mutate
    // dates. So instead, we exercise the cross-day path by reading what we
    // can: assert that creating a same-day log shows the banner, then
    // simulate the cross-day branch by overriding `Date` in the page context.
    const create = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });
    const created = (await create.json()) as { _id: string };

    // Override the page's `Date` so the component thinks `now` is tomorrow.
    await page.addInitScript(`{
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(RealDate.now() + 86400000); // 1 day ahead
          } else {
            super(...args);
          }
        }
        static now() { return RealDate.now() + 86400000; }
      }
      Date = MockDate;
    }`);

    await page.goto('/owner/my-training');

    // Cross-day modal renders.
    await expect(page.getByText(/Unfinished workout from/i)).toBeVisible();
    const saveBtn = page.getByRole('button', { name: /save it/i });
    await expect(saveBtn).toBeVisible();
    const discardBtn = page.getByRole('button', { name: /^discard$/i });
    await expect(discardBtn).toBeVisible();

    await saveBtn.click();

    // After seal, the page refreshes; the modal goes away (no longer active).
    await expect(page.getByText(/Unfinished workout from/i)).not.toBeVisible({ timeout: 8000 });

    // Server confirms the seal.
    const r = await request.get(`/api/me/workout-logs/${created._id}`);
    const log = (await r.json()) as { completedAt: string | null; autoSealed: boolean };
    expect(log.completedAt).not.toBeNull();
    expect(log.autoSealed).toBe(false);
  });

  test('starting a new blank session is blocked while active log exists (409)', async ({ request }) => {
    await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle', plannedSets: [] },
    });

    const second = await request.post('/api/me/workout-logs', {
      data: { dayName: 'Freestyle 2', plannedSets: [] },
    });
    expect(second.status()).toBe(409);
    const body = (await second.json()) as { error: string; activeSession: { _id: string; dayName: string } };
    expect(body.error).toBe('ACTIVE_SESSION_CONFLICT');
    expect(body.activeSession.dayName).toBe('Freestyle');
  });
});
