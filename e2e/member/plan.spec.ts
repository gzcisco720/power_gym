import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

async function clearTodayMemberSessions(
  request: import('@playwright/test').APIRequestContext,
) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const r = await request.get(
    `/api/sessions?memberId=me&start=${today.toISOString()}&end=${tomorrow.toISOString()}`,
  );
  if (r.ok()) {
    const sessions = (await r.json()) as Array<{ _id: string }>;
    await Promise.all(sessions.map((s) => request.delete(`/api/sessions/${s._id}`)));
  }
  const allRes = await request.get('/api/sessions?memberId=me');
  if (allRes.ok()) {
    const all = (await allRes.json()) as Array<{ _id: string; completedAt: string | null }>;
    const active = all.filter((s) => !s.completedAt);
    await Promise.all(active.map((s) => request.delete(`/api/sessions/${s._id}`)));
  }
}

async function startSession(page: import('@playwright/test').Page) {
  await page.goto('/member/plan');
  await page.getByRole('button', { name: /log this workout/i }).first().click();
  await page.waitForURL(/\/member\/plan\/session\/[^/]+$/, { timeout: 15000 });
}

test.describe('Member: Training Plan', () => {
  test.beforeEach(async ({ request }) => {
    await clearTodayMemberSessions(request);
  });

  test.afterEach(async ({ request }) => {
    const allRes = await request.get('/api/sessions?memberId=me');
    if (allRes.ok()) {
      const all = (await allRes.json()) as Array<{ _id: string; completedAt: string | null }>;
      const active = all.filter((s) => !s.completedAt);
      await Promise.all(active.map((s) => request.delete(`/api/sessions/${s._id}`)));
    }
  });

  test('plan page shows plan name and day name', async ({ page }) => {
    await page.goto('/member/plan');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
    await expect(page.getByText('Push')).toBeVisible();
  });

  test('start session navigates to session page', async ({ page }) => {
    await startSession(page);
    await expect(page.url()).toMatch(/\/member\/plan\/session\//);
  });

  test('session shows exercise name and prescribed reps', async ({ page }) => {
    await startSession(page);
    await expect(page.getByText('Bench Press')).toBeVisible();
    await expect(page.getByText('Reps: 8–12').first()).toBeVisible();
  });

  test('weight and reps inputs accept values and retain them', async ({ page }) => {
    await startSession(page);
    await page.getByLabel('Set 1 weight').fill('60');
    await page.getByLabel('Set 1 reps').fill('10');
    await expect(page.getByLabel('Set 1 weight')).toHaveValue('60');
    await expect(page.getByLabel('Set 1 reps')).toHaveValue('10');
  });

  test('X (delete) button removes that set row from the session', async ({ page }) => {
    await startSession(page);
    // 3 sets visible initially
    await expect(page.getByLabel('Set 1 weight')).toBeVisible();
    await expect(page.getByLabel('Set 2 weight')).toBeVisible();
    await expect(page.getByLabel('Set 3 weight')).toBeVisible();

    await page.getByRole('button', { name: 'Delete set 1' }).click();

    // Set 1 row gone; sets 2 and 3 remain
    await expect(page.getByLabel('Set 1 weight')).not.toBeVisible();
    await expect(page.getByLabel('Set 2 weight')).toBeVisible();
    await expect(page.getByLabel('Set 3 weight')).toBeVisible();
  });

  test('Complete Workout is blocked with toast when no sets are filled', async ({ page }) => {
    await startSession(page);
    await page.getByRole('button', { name: 'Complete Workout' }).click();
    // Modal must NOT appear
    await expect(page.getByRole('heading', { name: /Workout Completed!/i })).not.toBeVisible();
    // Toast error appears
    await expect(page.getByText(/fill in at least one set/i)).toBeVisible({ timeout: 5000 });
  });

  test('Complete Workout is blocked with red border when only reps filled (no weight)', async ({
    page,
  }) => {
    await startSession(page);
    await page.getByLabel('Set 1 reps').fill('10');
    await page.getByRole('button', { name: 'Complete Workout' }).click();

    // Modal must NOT appear
    await expect(page.getByRole('heading', { name: /Workout Completed!/i })).not.toBeVisible();
    // Weight input for set 1 gets a destructive ring (aria-label "Set 1 weight")
    const weightInput = page.getByLabel('Set 1 weight');
    await expect(weightInput).toHaveClass(/ring-destructive/);
  });

  test('Complete Workout is blocked with red border when only weight filled (no reps)', async ({
    page,
  }) => {
    await startSession(page);
    await page.getByLabel('Set 1 weight').fill('60');
    await page.getByRole('button', { name: 'Complete Workout' }).click();

    await expect(page.getByRole('heading', { name: /Workout Completed!/i })).not.toBeVisible();
    const repsInput = page.getByLabel('Set 1 reps');
    await expect(repsInput).toHaveClass(/ring-destructive/);
  });

  test('complete session after filling sets navigates to plan', async ({ page }) => {
    await startSession(page);

    // Fill all 3 prescribed sets (Bench Press × 3)
    for (let i = 1; i <= 3; i++) {
      await page.getByLabel(`Set ${i} weight`).fill('60');
      await page.getByLabel(`Set ${i} reps`).fill('10');
    }

    await page.getByRole('button', { name: 'Complete Workout' }).click();

    // Animation plays then "Finish Workout" form appears
    await expect(page.getByRole('button', { name: /Finish Workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /Finish Workout/i }).click();

    await page.waitForURL('/member/plan', { timeout: 15000 });
    await expect(page).toHaveURL('/member/plan');
  });

  test('empty sets are skipped and filled sets are saved on completion', async ({
    page,
    request,
  }) => {
    await startSession(page);

    // Fill only set 1, leave sets 2 and 3 empty
    await page.getByLabel('Set 1 weight').fill('70');
    await page.getByLabel('Set 1 reps').fill('8');

    await page.getByRole('button', { name: 'Complete Workout' }).click();
    await expect(page.getByRole('button', { name: /Finish Workout/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /Finish Workout/i }).click();

    await page.waitForURL('/member/plan', { timeout: 15000 });

    // Verify the session was marked complete with the correct data via API
    const sessionsRes = await request.get('/api/sessions?memberId=me');
    const sessions = (await sessionsRes.json()) as Array<{
      completedAt: string | null;
      sets: Array<{ actualWeight: number | null; actualReps: number | null; completedAt: string | null }>;
    }>;
    const completed = sessions.find((s) => s.completedAt !== null);
    expect(completed).toBeTruthy();
    // The first set has logged data; the other two are empty (completedAt null)
    const loggedSets = completed!.sets.filter((s) => s.completedAt !== null);
    expect(loggedSets).toHaveLength(1);
    expect(loggedSets[0].actualWeight).toBe(70);
    expect(loggedSets[0].actualReps).toBe(8);
  });
});
