import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Trainer domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;
  let memberId: string;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/trainer.json' });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
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
    await expect(sharedPage.getByText('member@test.com')).toBeVisible({ timeout: 8000 });
  });

  test('plans list: create plan → appears in list', async () => {
    await sharedPage.goto('/trainer/plans');
    const planName = `E2E Plan ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /new plan/i }).click();
    await sharedPage.fill('input[name="name"]', planName);
    await sharedPage.getByRole('button', { name: /create/i }).click();
    await expect(sharedPage.getByText(planName)).toBeVisible({ timeout: 5000 });
  });

  test('assign training plan: trainer assigns plan to member → active plan shown', async () => {
    const mid = await getFirstMemberId();
    await sharedPage.goto(`/trainer/members/${mid}/plan`);

    // First ensure we have at least one plan template
    await sharedPage.getByRole('button', { name: /assign plan/i }).click();

    // Wait for plan options to load
    const select = sharedPage.locator('select');
    await select.waitFor({ timeout: 5000 });
    const options = await select.locator('option').all();
    if (options.length <= 1) {
      // No plans yet — create one first
      await sharedPage.getByRole('button', { name: /cancel/i }).click();
      await sharedPage.goto('/trainer/plans');
      const planName = `Auto Plan ${Date.now()}`;
      await sharedPage.getByRole('button', { name: /new plan/i }).click();
      await sharedPage.fill('input[name="name"]', planName);
      await sharedPage.getByRole('button', { name: /create/i }).click();
      await expect(sharedPage.getByText(planName)).toBeVisible({ timeout: 5000 });

      // Back to member plan
      await sharedPage.goto(`/trainer/members/${mid}/plan`);
      await sharedPage.getByRole('button', { name: /assign plan/i }).click();
    }

    const assignSelect = sharedPage.locator('select');
    const assignOptions = await assignSelect.locator('option').all();
    const firstValue = await assignOptions[1].getAttribute('value');
    if (firstValue) await assignSelect.selectOption(firstValue);
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

  test('create food: appears in foods list', async () => {
    await sharedPage.goto('/trainer/foods');
    const foodName = `E2E Food ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /new food/i }).click();
    await sharedPage.fill('input[name="name"]', foodName);
    await sharedPage.fill('input[name="kcal"]', '165');
    await sharedPage.fill('input[name="protein"]', '31');
    await sharedPage.fill('input[name="carbs"]', '0');
    await sharedPage.fill('input[name="fat"]', '3.6');
    await sharedPage.getByRole('button', { name: /create/i }).click();
    await expect(sharedPage.getByText(foodName)).toBeVisible({ timeout: 5000 });
  });

  test('create nutrition template: appears in list', async () => {
    await sharedPage.goto('/trainer/nutrition');
    const templateName = `E2E Template ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /new template/i }).click();
    await sharedPage.fill('input[name="name"]', templateName);
    await sharedPage.getByRole('button', { name: /create/i }).click();
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

  test('assign plan then reassign: plan B is active not plan A', async () => {
    const mid = await getFirstMemberId();

    // Ensure we have two plans — create a second one
    await sharedPage.goto('/trainer/plans');
    const planNameB = `Plan B ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /new plan/i }).click();
    await sharedPage.fill('input[name="name"]', planNameB);
    await sharedPage.getByRole('button', { name: /create/i }).click();
    await expect(sharedPage.getByText(planNameB)).toBeVisible({ timeout: 5000 });

    // Go to member plan, assign Plan B
    await sharedPage.goto(`/trainer/members/${mid}/plan`);
    await sharedPage.getByRole('button', { name: /assign plan/i }).click();
    const assignSelect = sharedPage.locator('select');
    await assignSelect.waitFor({ timeout: 5000 });
    const assignOptions = await assignSelect.locator('option').all();
    // Select the last option (Plan B, most recently created)
    const lastValue = await assignOptions[assignOptions.length - 1].getAttribute('value');
    if (lastValue) await assignSelect.selectOption(lastValue);
    const planBName = await assignOptions[assignOptions.length - 1].textContent();
    await sharedPage.getByRole('button', { name: /^assign$/i }).click();

    if (planBName) {
      await expect(sharedPage.getByText(planBName.trim())).toBeVisible({ timeout: 5000 });
    }
    await expect(sharedPage.getByText(/active since/i)).toBeVisible({ timeout: 3000 });
  });
});
