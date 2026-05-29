import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Member domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/member.json' });
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

    const startBtn = sharedPage.getByRole('button', { name: /start session/i });
    const hasStartBtn = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasStartBtn) {
      // No plan assigned — skip session part, just verify page renders
      await expect(sharedPage.getByRole('heading', { name: /my training/i })).toBeVisible();
      return;
    }

    await startBtn.click();

    // Should navigate to session page
    await sharedPage.waitForURL(/\/member\/my-training\/session\//, { timeout: 10000 });

    // Fill in a set if there are inputs
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

  test('settings — member updates profile fields → save-success toast', async () => {
    await sharedPage.goto('/member/settings');
    await sharedPage.waitForSelector('h1', { timeout: 8000 });

    await expect(sharedPage.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Fill in firstName and lastName
    const firstNameInput = sharedPage.locator('#firstName');
    const lastNameInput = sharedPage.locator('#lastName');

    await firstNameInput.waitFor({ timeout: 5000 });
    await firstNameInput.fill('Test');
    await lastNameInput.fill('Member');

    await sharedPage.getByRole('button', { name: /^save$/i }).click();

    // Toast should appear
    await expect(sharedPage.getByText(/settings saved/i)).toBeVisible({ timeout: 8000 });
  });
});
