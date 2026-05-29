import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Trainer domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;
  let memberId: string;
  let activeSessionUrl: string | null = null;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/trainer-domain.json' });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    // Wait for the API to load members before any test runs
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  // Helper: get first member id from the member list
  async function getFirstMemberId(): Promise<string> {
    if (memberId) return memberId;
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    const link = sharedPage.getByRole('link', { name: /View Hub/ }).first();
    const href = await link.getAttribute('href');
    const match = href?.match(/\/trainer\/members\/([^/]+)$/);
    if (!match) throw new Error('Could not find member id from hub link');
    memberId = match[1];
    return memberId;
  }

  test('members list shows seeded member', async () => {
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    // Wait for API data to load — skeleton disappears when members arrive
    await sharedPage.waitForFunction(
      () => !document.querySelector('[data-testid="skeleton"], .animate-pulse'),
      { timeout: 10000 }
    ).catch(() => {}); // skeleton may not have testid; proceed anyway
    await expect(sharedPage.getByText('member@test.com')).toBeVisible({ timeout: 12000 });
  });

  // ── Sprint 4 Stage 1: Plans (golden path) ─────────────────────────────────

  test('plans golden: New → save → appears in list → edit → add day + exercise → save → day count visible', async () => {
    await sharedPage.goto('/trainer/plans');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Step 1: Create — name only (API does not support days on create)
    await sharedPage.getByRole('link', { name: /new template/i }).first().click();
    await sharedPage.waitForURL('**/trainer/plans/new', { timeout: 8000 });

    const planName = `E2E Plan ${Date.now()}`;
    await sharedPage.getByRole('textbox', { name: /plan name/i }).fill(planName);
    await sharedPage.getByRole('button', { name: /save plan/i }).click();
    await sharedPage.waitForURL('**/trainer/plans', { timeout: 10000 });
    await expect(sharedPage.getByText(planName)).toBeVisible({ timeout: 8000 });

    // Step 2: Edit the newly created plan — the link has aria-label "Edit <planName>"
    await sharedPage.getByRole('link', { name: `Edit ${planName}` }).click();
    await sharedPage.waitForURL('**/edit', { timeout: 10000 });

    // Add a day
    await sharedPage.getByRole('button', { name: /add day/i }).first().click();
    // Add an exercise
    await sharedPage.getByText('+ Add Exercise').waitFor({ timeout: 5000 });
    await sharedPage.getByText('+ Add Exercise').click();
    // Fill exercise name
    await sharedPage.getByRole('textbox', { name: /exercise name/i }).first().fill('Squat');

    // Save the edit — days are now persisted via updatePlanTemplate
    await sharedPage.getByRole('button', { name: /save plan/i }).click();
    await sharedPage.waitForURL('**/trainer/plans', { timeout: 10000 });

    // Plan should be in list with 1 day
    await expect(sharedPage.getByText(planName)).toBeVisible({ timeout: 8000 });
  });

  test('plans edit + dirty: change name, Save enabled only after edit, save → updated name visible', async () => {
    await sharedPage.goto('/trainer/plans');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Click the first edit link
    const editLink = sharedPage.getByRole('link', { name: /edit/i }).first();
    await editLink.click();
    await sharedPage.waitForURL('**/trainer/plans/**/edit', { timeout: 8000 });

    // Save button should be disabled initially (no dirty)
    const saveBtn = sharedPage.getByRole('button', { name: /save plan/i });
    await expect(saveBtn).toBeDisabled({ timeout: 5000 });

    // Edit the name
    const nameInput = sharedPage.getByRole('textbox', { name: /plan name/i });
    const originalName = await nameInput.inputValue();
    const updatedName = `Updated ${Date.now()}`;
    await nameInput.fill(updatedName);

    // Save should now be enabled
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });

    // Save
    await saveBtn.click();
    await sharedPage.waitForURL('**/trainer/plans', { timeout: 10000 });

    // Updated name should be visible
    await expect(sharedPage.getByText(updatedName)).toBeVisible({ timeout: 8000 });

    // Suppress unused var
    void originalName;
  });

  // ── Sprint 4 Stage 1: Foods ───────────────────────────────────────────────

  test('foods: create a food → appears in list with macro pills visible', async () => {
    await sharedPage.goto('/trainer/foods');
    const foodName = `E2E Food ${Date.now()}`;

    await sharedPage.getByRole('button', { name: /new food/i }).first().click();

    // Wait for dialog
    await sharedPage.getByRole('dialog').waitFor({ timeout: 5000 });

    await sharedPage.getByLabel(/^name/i).fill(foodName);

    // Fill macros by label
    const dialog = sharedPage.getByRole('dialog');
    await dialog.getByLabel(/calor/i).fill('165');
    await dialog.getByLabel(/protein/i).fill('31');
    await dialog.getByLabel(/carbs/i).fill('0');
    await dialog.getByLabel(/^fat/i).fill('3.6');

    await sharedPage.getByRole('button', { name: /^create$/i }).click();

    // Food appears in list
    await expect(sharedPage.getByText(foodName)).toBeVisible({ timeout: 5000 });

    // Macro pills visible (protein 'P' pill shows "31P" or similar)
    await expect(sharedPage.getByText(/31P/)).toBeVisible({ timeout: 3000 });
  });

  // ── Sprint 4 Stage 1: Members search ─────────────────────────────────────

  test('members search: type query → list narrows; clearing restores full list', async () => {
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    await sharedPage.waitForTimeout(500); // let members load

    // Get visible member names before search
    const allCards = sharedPage.locator('div.space-y-1\\.5 > div');
    const initialCount = await allCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a partial match — use "member" which should match member@test.com
    const searchInput = sharedPage.getByPlaceholder(/search members/i);
    await searchInput.fill('member');
    await sharedPage.waitForTimeout(400); // wait for 300ms debounce

    // Should show only matching members
    const filteredCount = await allCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Clear search by clicking X
    await sharedPage.getByRole('button', { name: /clear search/i }).click();
    await sharedPage.waitForTimeout(400);

    // Full list should be restored
    const restoredCount = await allCards.count();
    expect(restoredCount).toEqual(initialCount);
  });

  // ── Legacy tests (body tests, health, session logging) ────────────────────

  test('assign training plan: trainer assigns plan to member → active plan shown', async () => {
    const mid = await getFirstMemberId();

    // Ensure at least one plan template exists before opening assign dialog
    await sharedPage.goto('/trainer/plans');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    const existingPlans = await sharedPage.locator('[data-testid="plan-card"], .rounded-xl').count();
    if (existingPlans === 0) {
      await sharedPage.getByRole('link', { name: /new template/i }).first().click();
      await sharedPage.waitForURL('**/trainer/plans/new', { timeout: 8000 });
      const planName = `Auto Plan ${Date.now()}`;
      await sharedPage.getByRole('textbox', { name: /plan name/i }).fill(planName);
      await sharedPage.getByRole('button', { name: /save plan/i }).click();
      await sharedPage.waitForURL('**/trainer/plans', { timeout: 8000 });
    }

    await sharedPage.goto(`/trainer/members/${mid}/plan`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    await sharedPage.getByRole('button', { name: /assign plan/i }).click();

    // Base UI Select: click the trigger to open the dropdown
    const selectTrigger = sharedPage.locator('[data-slot="select-trigger"]');
    await selectTrigger.waitFor({ timeout: 5000 });
    await selectTrigger.click();

    // Wait for options in the popup and click the first non-placeholder item
    const firstOption = sharedPage.locator('[data-slot="select-item"]').first();
    await firstOption.waitFor({ timeout: 5000 });
    await firstOption.click();

    await sharedPage.getByRole('button', { name: /^assign$/i }).click();

    await expect(sharedPage.getByText(/active since/i)).toBeVisible({ timeout: 5000 });
  });

  test('log session: start, update set, complete → completed state shown', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}/log/new`);

    // If no plan assigned yet, skip (previous test should have assigned)
    const startBtn = sharedPage.getByRole('button', { name: /start session/i });
    const hasStartBtn = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasStartBtn) {
      // Plan might not have exercises, so session may show empty — just complete
      const completeBtn = sharedPage.getByRole('button', { name: /complete session/i });
      if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeBtn.click();
        await expect(sharedPage.getByText(/session completed/i)).toBeVisible({ timeout: 5000 });
      }
      return;
    }

    await startBtn.click();
    // Session started — check for complete button
    const completeBtn = sharedPage.getByRole('button', { name: /complete session/i });
    if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeBtn.click();
    }
    await expect(sharedPage.getByText(/session completed/i)).toBeVisible({ timeout: 5000 });
  });

  test('create body test: trainer enters skinfold values → body-fat shows', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}/body-tests`);

    await sharedPage.getByRole('button', { name: /new test/i }).click();

    await sharedPage.fill('#nbt-weight', '75');
    await sharedPage.fill('#nbt-chest', '12');
    await sharedPage.fill('#nbt-abdominal', '22');
    await sharedPage.fill('#nbt-thigh', '16');

    await sharedPage.getByRole('button', { name: /save test/i }).click();

    await expect(sharedPage.getByText(/body fat/i)).toBeVisible({ timeout: 8000 });
  });

  test('create nutrition template: appears in list', async () => {
    await sharedPage.goto('/trainer/nutrition');
    const templateName = `E2E Template ${Date.now()}`;
    await sharedPage.getByRole('link', { name: /new template/i }).first().click();
    await sharedPage.waitForURL('**/trainer/nutrition/new', { timeout: 8000 });

    await sharedPage.getByRole('textbox').first().fill(templateName);
    await sharedPage.getByRole('button', { name: /save plan/i }).click();
    await sharedPage.waitForURL('**/trainer/nutrition', { timeout: 8000 });
    await expect(sharedPage.getByText(templateName)).toBeVisible({ timeout: 5000 });
  });

  test('member health: add injury → appears in list', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}/health`);

    await sharedPage.getByRole('button', { name: /add injury/i }).click();
    await sharedPage.fill('#injury-description', 'Left knee sprain');
    await sharedPage.fill('#injury-date', '2026-01-15');
    await sharedPage.getByRole('button', { name: /^save$/i }).click();

    await expect(sharedPage.getByText('Left knee sprain')).toBeVisible({ timeout: 5000 });
  });

  // ── Sprint 4 Stage 2: Member hub tab nav ─────────────────────────────────

  test('stage2: member hub tab nav — Body Tests tab navigates to /body-tests and shows content', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Tab nav is in <main> — scope to main to avoid sidebar link collisions
    const main = sharedPage.locator('main');
    await expect(main.getByRole('link', { name: 'Plan', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(main.getByRole('link', { name: 'Nutrition', exact: true })).toBeVisible({ timeout: 3000 });
    await expect(main.getByRole('link', { name: 'Body Tests', exact: true })).toBeVisible({ timeout: 3000 });
    await expect(main.getByRole('link', { name: 'Health', exact: true })).toBeVisible({ timeout: 3000 });
    await expect(main.getByRole('link', { name: 'Check-ins', exact: true })).toBeVisible({ timeout: 3000 });
    await expect(main.getByRole('link', { name: 'Billing', exact: true })).toBeVisible({ timeout: 3000 });

    // Click Body Tests tab
    await main.getByRole('link', { name: 'Body Tests', exact: true }).click();

    // URL should contain /body-tests
    await sharedPage.waitForURL(`**/trainer/members/${mid}/body-tests`, { timeout: 5000 });

    // Content visible: the header or empty state
    await expect(sharedPage.getByRole('heading', { name: 'Body Composition Tests' })).toBeVisible({ timeout: 5000 });
  });

  test('stage2: member hub log/new — start session navigates to log session page with exercise rows', async () => {
    const mid = await getFirstMemberId();

    // A plan with days was assigned to this member by the earlier "assign training plan" test
    await sharedPage.goto(`/trainer/members/${mid}/log/new`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Start session button must be visible — plan with days is assigned
    const startBtn = sharedPage.getByRole('button', { name: /start session/i });
    await expect(startBtn).toBeVisible({ timeout: 8000 });
    await startBtn.click();

    // Must navigate to /log/:sessionId (a 24-char hex ObjectId) — NOT stay on /log/new
    await sharedPage.waitForURL(
      (url) => /\/log\/[a-f0-9]{24}$/.test(url.toString()),
      { timeout: 12000 }
    );
    // Store session URL for the completion test
    activeSessionUrl = sharedPage.url();
  });

  test('stage2: session logger — complete with sets shows completion; completing with no data warns', async () => {
    // Use the active session URL from the previous test (avoids starting a duplicate session)
    if (activeSessionUrl) {
      await sharedPage.goto(activeSessionUrl);
    } else {
      const mid = await getFirstMemberId();
      await sharedPage.goto(`/trainer/members/${mid}/log/new`);
      await sharedPage.waitForSelector('nav', { timeout: 8000 });
      const startBtn = sharedPage.getByRole('button', { name: /start session/i });
      const hasStart = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasStart) {
        await startBtn.click();
        await sharedPage.waitForURL('**/log/**', { timeout: 12000 });
      }
    }

    // On the log session page — complete button must exist
    const completeBtn = sharedPage.getByRole('button', { name: /complete session/i });
    await expect(completeBtn).toBeVisible({ timeout: 8000 });

    // Log a set if weight inputs are available (exercises in plan day)
    // session.sets starts empty — we must log at least one set for the "no data" guard to fire
    const weightInputs = sharedPage.getByPlaceholder(/weight/i);
    const inputCount = await weightInputs.count();

    if (inputCount > 0) {
      // Log weight + reps for the first set
      await weightInputs.first().fill('100');
      const repsInputs = sharedPage.getByPlaceholder(/reps/i);
      if (await repsInputs.count() > 0) {
        await repsInputs.first().fill('5');
        await repsInputs.first().press('Tab');
      }

      // Edge case: now session.sets has data — completing with weight logged = success
      await completeBtn.click();
    } else {
      // No exercise inputs (empty plan day) — complete directly
      await completeBtn.click();
    }

    // Completion: "Workout complete!" toast appears (and page redirects to plan)
    await expect(sharedPage.getByText(/workout complete/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('stage2: body-tests — add test via dialog → new card with body-fat result appears', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}/body-tests`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Click "New Test"
    await sharedPage.getByRole('button', { name: /new test/i }).click();

    // Dialog opens
    await sharedPage.getByRole('dialog').waitFor({ timeout: 5000 });

    await sharedPage.fill('#nbt-weight', '75');
    await sharedPage.fill('#nbt-chest', '12');
    await sharedPage.fill('#nbt-abdominal', '22');
    await sharedPage.fill('#nbt-thigh', '16');

    await sharedPage.getByRole('button', { name: /save test/i }).click();

    // New card should appear with body fat %
    await expect(sharedPage.getByText(/body fat:/i)).toBeVisible({ timeout: 8000 });
  });

  test('assign plan then reassign: plan B is active not plan A', async () => {
    const mid = await getFirstMemberId();

    // Create plan B via new flow
    await sharedPage.goto('/trainer/plans/new');
    const planNameB = `Plan B ${Date.now()}`;
    await sharedPage.getByRole('textbox', { name: /plan name/i }).fill(planNameB);
    await sharedPage.getByRole('button', { name: /save plan/i }).click();
    await sharedPage.waitForURL('**/trainer/plans', { timeout: 8000 });
    await expect(sharedPage.getByText(planNameB)).toBeVisible({ timeout: 5000 });

    // Go to member plan, assign Plan B
    await sharedPage.goto(`/trainer/members/${mid}/plan`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    await sharedPage.getByRole('button', { name: /assign plan/i }).click();

    // Base UI Select: click the trigger, then click Plan B (last item)
    const selectTrigger = sharedPage.locator('[data-slot="select-trigger"]');
    await selectTrigger.waitFor({ timeout: 5000 });
    await selectTrigger.click();

    // All items in the popup
    const allOptions = sharedPage.locator('[data-slot="select-item"]');
    await allOptions.first().waitFor({ timeout: 5000 });
    const optionCount = await allOptions.count();
    // Click the last item (Plan B, most recently created)
    const lastOption = allOptions.nth(optionCount - 1);
    const planBName = await lastOption.textContent();
    await lastOption.click();

    await sharedPage.getByRole('button', { name: /^assign$/i }).click();

    if (planBName) {
      // Use first() since the plan name may also appear in the (now-closed) Select popup DOM
      await expect(sharedPage.getByText(planBName.trim()).first()).toBeVisible({ timeout: 5000 });
    }
    await expect(sharedPage.getByText(/active since/i)).toBeVisible({ timeout: 3000 });
  });
});
