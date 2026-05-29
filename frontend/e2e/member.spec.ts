import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const FRONTEND_BASE = 'http://localhost:5173';

test.describe('Member domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // Use a dedicated trainer auth file (trainer-member-setup.json) created by global-setup.
    // Doing a fresh login here would consume the rate-limited /login quota mid-suite
    // and break subsequent z-auth tests. The stored httpOnly cookie is used to call
    // /refresh (which is @SkipThrottle), so no login request is needed at runtime.
    const trainerCtx = await browser.newContext({
      storageState: 'e2e/.auth/trainer-member-setup.json',
      baseURL: FRONTEND_BASE,
    });
    const trainerPage = await trainerCtx.newPage();

    // Navigate to the trainer dashboard to activate the session (triggers silent refresh)
    await trainerPage.goto('/trainer/members');
    await trainerPage.waitForSelector('nav', { timeout: 15000 });

    // Get a fresh access token via the refresh endpoint — page.evaluate cannot reach the
    // Zustand store's in-memory state because the browser sandbox has a separate module instance.
    const setupResult: { ok: boolean; error?: string } = await trainerPage.evaluate(async () => {
      const refreshRes = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refreshRes.ok) return { ok: false, error: `refresh failed: ${refreshRes.status}` };
      const { access_token: accessToken } = await refreshRes.json() as { access_token: string };

      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };

      const membersRes = await fetch('/api/v1/members', { headers, credentials: 'include' });
      if (!membersRes.ok) return { ok: false, error: `members failed: ${membersRes.status}` };
      const members = await membersRes.json() as Array<{ _id: string; email: string }>;
      if (!Array.isArray(members)) return { ok: false, error: 'members not array' };

      const member = members.find((m) => m.email === 'member@test.com');
      if (!member) return { ok: false, error: `member@test.com not in list (got ${members.length} members)` };

      const plansRes = await fetch('/api/v1/plan-templates', { headers, credentials: 'include' });
      if (!plansRes.ok) return { ok: false, error: `plans failed: ${plansRes.status}` };
      let plans = await plansRes.json() as Array<{ _id: string }>;

      if (!plans.length) {
        const createRes = await fetch('/api/v1/plan-templates', {
          method: 'POST', headers, credentials: 'include',
          body: JSON.stringify({ name: 'E2E Test Plan', days: [{ dayNumber: 1, name: 'Day 1', exercises: [] }] }),
        });
        if (!createRes.ok) return { ok: false, error: `plan create failed: ${createRes.status}` };
        plans = [await createRes.json()];
      }

      const assignRes = await fetch(`/api/v1/members/${member._id}/plan`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ templateId: plans[0]._id }),
      });
      return assignRes.ok ? { ok: true } : { ok: false, error: `assign failed: ${assignRes.status}` };
    });

    if (!setupResult.ok) {
      console.warn(`member.spec beforeAll: plan setup failed (${setupResult.error})`);
    }

    await trainerCtx.close();

    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/member-domain.json' });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/member');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('session lifecycle — member starts session, logs set, completes → "Session Complete" shown', async () => {
    await sharedPage.goto('/member/my-training');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // Plan must have been assigned in beforeAll — assert Start Session is present
    const startBtn = sharedPage.getByRole('button', { name: /start session/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    await startBtn.click();

    await sharedPage.waitForURL(/\/member\/my-training\/session\//, { timeout: 10000 });

    // Fill in weight and reps for the first set if exercises are present
    const weightInput = sharedPage.locator('input[placeholder="Weight (kg)"]').first();
    const hasWeightInput = await weightInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasWeightInput) {
      await weightInput.fill('80');
      await weightInput.blur();
      const repsInput = sharedPage.locator('input[placeholder="Reps"]').first();
      await repsInput.fill('10');
      await repsInput.blur();
    }

    const completeBtn = sharedPage.getByRole('button', { name: /complete session/i });
    await completeBtn.waitFor({ timeout: 5000 });
    await completeBtn.click();

    // Should show "Session Complete" after completing
    await expect(sharedPage.getByText(/session complete/i)).toBeVisible({ timeout: 8000 });
  });

  test('check-in flow — submit check-in form or verify already-submitted state', async () => {
    await sharedPage.goto('/member/check-in/new');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // The heading must be present
    await expect(sharedPage.getByRole('heading', { name: /weekly check-in/i })).toBeVisible();

    // Check if already submitted
    const alreadySubmitted = await sharedPage.getByText(/you've already submitted your check-in this week/i).isVisible({ timeout: 1000 }).catch(() => false);

    if (alreadySubmitted) {
      // This is the "already_submitted" state — test passes
      return;
    }

    // Verify "How are you feeling?" section
    await expect(sharedPage.getByText(/how are you feeling/i)).toBeVisible();

    // Verify stuck-to-diet buttons exist
    await expect(sharedPage.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: 'Partial' })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: 'No' })).toBeVisible();

    // Verify submit button
    await expect(sharedPage.getByRole('button', { name: /submit check-in/i })).toBeVisible();

    // Verify placeholder texts in textareas
    await expect(sharedPage.locator('textarea[placeholder="Describe your diet this week..."]')).toBeVisible();
    await expect(sharedPage.locator('textarea[placeholder="How are you feeling overall?"]')).toBeVisible();

    // Fill and submit
    await sharedPage.getByRole('button', { name: 'Yes' }).click();
    await sharedPage.getByRole('button', { name: /submit check-in/i }).click();

    // After submit — show success or already-submitted state
    await expect(
      sharedPage.getByText(/check-in submitted successfully|you've already submitted/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test('check-in edge case — re-submit shows already-submitted message', async () => {
    // Navigate to fresh check-in form
    await sharedPage.goto('/member/check-in/new');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // Either already in the already-submitted state from the previous test,
    // or we submit again and get the 409 error
    const alreadyMsg = sharedPage.getByText(/you've already submitted your check-in this week/i);
    const isAlready = await alreadyMsg.isVisible({ timeout: 1000 }).catch(() => false);

    if (isAlready) {
      await expect(alreadyMsg).toBeVisible();
      return;
    }

    // Try to submit; if form is visible, try submitting
    const submitBtn = sharedPage.getByRole('button', { name: /submit check-in/i });
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitBtn.click();
      // After second submit → already_submitted error should appear
      await expect(alreadyMsg).toBeVisible({ timeout: 8000 });
    }
  });

  test('nutrition page — renders My Plan and Freestyle sections', async () => {
    await sharedPage.goto('/member/nutrition');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /my nutrition/i })).toBeVisible();
    await expect(sharedPage.getByText('My Plan')).toBeVisible();
    await expect(sharedPage.getByText('Freestyle')).toBeVisible();
  });

  test('nutrition day view — freestyle day renders with date and log prompt', async () => {
    const today = new Date().toISOString().split('T')[0];
    await sharedPage.goto(`/member/nutrition/day?date=${today}&mode=free`);
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // Freestyle mode must show the "Freestyle" heading
    await expect(sharedPage.getByRole('heading', { name: /freestyle/i })).toBeVisible();

    // The date paragraph (exact text) should be visible
    await expect(sharedPage.getByText(today, { exact: true })).toBeVisible();

    // The day log prompt ("Log your food" text or "No entries yet") must be visible
    await expect(
      sharedPage.getByText(/log your food for the day|no entries yet/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('body tests page — renders (may show empty list)', async () => {
    await sharedPage.goto('/member/body-tests');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /body composition tests/i })).toBeVisible();
    // Either shows tests or the empty state
    const hasTests = await sharedPage.locator('.rounded-xl').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmpty = await sharedPage.getByText(/no tests recorded/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasTests || hasEmpty).toBe(true);
  });

  test('journey/progress page — renders chart section', async () => {
    await sharedPage.goto('/member/journey');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /my journey/i })).toBeVisible();
    // Either shows a chart or the empty state
    const hasChart = await sharedPage.locator('.recharts-wrapper').isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmpty = await sharedPage.getByText(/no 1rm data yet/i).isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasChart || hasEmpty).toBe(true);
  });

  test('settings — member updates bio → save-success toast', async () => {
    await sharedPage.goto('/member/settings');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Member settings shows read-only name fields and editable bio
    await expect(sharedPage.getByText(/contact your trainer to update your name/i)).toBeVisible();

    // Update bio
    const bioTextarea = sharedPage.locator('#bio');
    await bioTextarea.waitFor({ timeout: 5000 });
    await bioTextarea.fill('E2E test bio update');

    await sharedPage.getByRole('button', { name: /^save$/i }).click();

    // Toast should appear
    await expect(sharedPage.getByText(/settings saved/i)).toBeVisible({ timeout: 8000 });
  });

  // Sprint 5 Stage 1 E2E scenarios

  test('sprint5 — dashboard renders summary stat cards and working My Training link', async () => {
    await sharedPage.goto('/member');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // PageHeader title is "Dashboard"
    await expect(sharedPage.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // At least one StatCard label visible (not plain link chips)
    const hasStatCard = await sharedPage.locator('.rounded-xl').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasStatCard).toBe(true);

    // My Training link exists and navigates
    const myTrainingLink = sharedPage.getByRole('link', { name: /my training/i }).first();
    await expect(myTrainingLink).toBeVisible({ timeout: 5000 });
    await myTrainingLink.click();

    await sharedPage.waitForURL(/\/member\/my-training/, { timeout: 8000 });
    await expect(sharedPage.getByRole('heading', { name: /my training/i })).toBeVisible({ timeout: 5000 });
  });

  test('sprint5 — my-training: plan card and freestyle card render', async () => {
    await sharedPage.goto('/member/my-training');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /my training/i })).toBeVisible();

    // Both path cards must be present
    await expect(sharedPage.getByText(/my plan/i)).toBeVisible({ timeout: 5000 });
    await expect(sharedPage.getByText(/freestyle/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('sprint5 — session: revisiting session route after completion redirects to my-training', async () => {
    // After the session lifecycle test, activeSession is completed.
    // Visiting the session route should redirect back to my-training.
    await sharedPage.goto('/member/my-training/session/nonexistent-id');
    // Since activeSession is null (completed sessions clear store on reload), redirect should happen
    await sharedPage.waitForURL(/\/member\/my-training/, { timeout: 8000 });
    await expect(sharedPage.getByRole('heading', { name: /my training/i })).toBeVisible({ timeout: 5000 });
  });

  test('sprint5 — nutrition freestyle: food picker opens and macro summary updates on add', async () => {
    const today = new Date().toISOString().split('T')[0];
    await sharedPage.goto(`/member/nutrition/day?date=${today}&mode=free`);
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    // Freestyle heading
    await expect(sharedPage.getByRole('heading', { name: /freestyle/i })).toBeVisible();

    // "Add food" button should be visible
    const addFoodBtn = sharedPage.getByRole('button', { name: /add food/i }).first();
    await expect(addFoodBtn).toBeVisible({ timeout: 5000 });
    await addFoodBtn.click();

    // Food picker dialog opens
    await expect(sharedPage.getByText(/add food/i).first()).toBeVisible({ timeout: 5000 });
    const searchInput = sharedPage.locator('input[placeholder="Search foods…"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Food items appear (may need to wait for API load) or close dialog
    // If no foods, just close and verify macro summary stays hidden
    const hasFoods = await sharedPage.locator('button').filter({ hasText: /kcal\/100g/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasFoods) {
      // Click first food item to add it
      await sharedPage.locator('button').filter({ hasText: /kcal\/100g/i }).first().click();

      // Dialog closes and macro summary row appears (shows total kcal + macro pills)
      await expect(sharedPage.getByText(/today's total/i)).toBeVisible({ timeout: 5000 });
    } else {
      // No foods seeded — close the dialog and confirm page is stable
      await sharedPage.keyboard.press('Escape');
      // Page should still show the freestyle heading
      await expect(sharedPage.getByRole('heading', { name: /freestyle/i })).toBeVisible({ timeout: 3000 });
    }
  });
});
