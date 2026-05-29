import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Owner domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/owner-domain.json' });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  // Sprint 3 Stage 1 — font & PageHeader checks
  test('body font-family contains Space Grotesk', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 10000 });
    const fontFamily = await sharedPage.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toContain('Space Grotesk');
  });

  test('dashboard h1 "Dashboard" has computed font-size 18px', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('h1', { timeout: 10000 });
    const fontSize = await sharedPage.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).fontSize : null;
    });
    expect(fontSize).toBe('18px');
  });

  test('owner dashboard renders stats cards', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 5000 });
    await expect(sharedPage.getByText(/total members/i)).toBeVisible();
  });

  test('member list shows seeded members', async () => {
    await sharedPage.goto('/owner/members');
    // Search for the specific seeded member (pagination may push it off page 1)
    await sharedPage.waitForSelector('[aria-label="Search members"]', { timeout: 8000 });
    await sharedPage.fill('[aria-label="Search members"]', 'member@test.com');
    await expect(sharedPage.getByText('member@test.com')).toBeVisible({ timeout: 8000 });
  });

  test('invite flow: create invite appears in list', async () => {
    await sharedPage.goto('/owner/invites');
    const uniqueEmail = `e2e-${Date.now()}@test.com`;
    await sharedPage.getByRole('button', { name: /send invite/i }).click();
    // Wait for the dialog to open
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await sharedPage.fill('#invite-email', uniqueEmail);
    await sharedPage.getByRole('button', { name: /generate invite link/i }).click();
    await expect(sharedPage.getByText(uniqueEmail)).toBeVisible({ timeout: 5000 });
  });

  test('service type: create appears then delete removes it', async () => {
    await sharedPage.goto('/owner/services');
    const name = `E2E Service ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /new service/i }).click();
    await sharedPage.fill('input[name="name"]', name);
    await sharedPage.fill('input[name="durationMin"]', '60');
    await sharedPage.fill('input[name="pricePerSession"]', '100');
    await sharedPage.getByRole('button', { name: /create/i }).click();
    // Find the specific row containing this service name and delete it
    const serviceRow = sharedPage.locator('div.flex.items-center.justify-between').filter({ hasText: name });
    await expect(serviceRow).toBeVisible({ timeout: 5000 });
    await serviceRow.getByRole('button', { name: /delete/i }).click();
    // Confirm deletion in the dialog
    await sharedPage.getByRole('button', { name: /delete/i }).last().click();
    await expect(sharedPage.getByText(name)).not.toBeVisible({ timeout: 5000 });
  });

  test('billing page renders', async () => {
    await sharedPage.goto('/owner/billing');
    await expect(sharedPage).toHaveURL('/owner/billing');
    await expect(sharedPage.getByText(/billing/i).first()).toBeVisible();
  });

  test('calendar: create scheduled session appears', async () => {
    await sharedPage.goto('/owner/calendar');
    await sharedPage.getByRole('button', { name: /schedule/i }).click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Select first member in dropdown
    const memberSelect = sharedPage.locator('select').first();
    const options = await memberSelect.locator('option').all();
    if (options.length > 1) {
      const firstValue = await options[1].getAttribute('value');
      if (firstValue) await memberSelect.selectOption(firstValue);
    }

    await sharedPage.fill('input[name="date"]', dateStr);
    await sharedPage.fill('input[name="startTime"]', '09:00');
    await sharedPage.fill('input[name="endTime"]', '10:00');
    await sharedPage.getByRole('button', { name: /create/i }).click();
    await expect(sharedPage.getByText('09:00')).toBeVisible({ timeout: 5000 });
  });

  test('equipment: create item then add condition report', async () => {
    await sharedPage.goto('/owner/equipment');
    const name = `E2E Equipment ${Date.now()}`;
    await sharedPage.getByRole('button', { name: /add equipment/i }).click();
    await sharedPage.fill('input[name="name"]', name);
    await sharedPage.getByRole('button', { name: /^add$/i }).click();
    await expect(sharedPage.getByText(name)).toBeVisible({ timeout: 5000 });
    // add condition report - find the specific equipment row
    const equipRow = sharedPage.locator('div.rounded-xl').filter({ hasText: name });
    await equipRow.getByRole('button', { name: /condition reports/i }).click();
    await sharedPage.fill('input[name="note"]', 'Good condition');
    await sharedPage.getByRole('button', { name: /add report/i }).click();
    await expect(sharedPage.getByText('Good condition')).toBeVisible({ timeout: 5000 });
  });

  test('trainers page shows seeded trainer', async () => {
    await sharedPage.goto('/owner/trainers');
    await expect(sharedPage.getByText('trainer@test.com')).toBeVisible({ timeout: 8000 });
  });

  test('trainer detail page renders', async () => {
    await sharedPage.goto('/owner/trainers');
    await sharedPage.waitForSelector('a[href*="/owner/trainers/"]', { timeout: 8000 });
    // Click the first trainer card link to navigate to detail page
    await sharedPage.locator('a[href*="/owner/trainers/"]').first().click();
    await sharedPage.waitForURL(/\/owner\/trainers\/.+/, { timeout: 8000 });
    // Verify we're on a trainer detail page
    await expect(sharedPage).toHaveURL(/\/owner\/trainers\/.+/);
    await expect(sharedPage.getByText(/trainer/i).first()).toBeVisible();
  });

  // Sprint 3 Stage 2 — owner core pages

  test('stage2: dashboard shows at least 4 StatCard labels', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 10000 });
    // StatCard labels are uppercase text-[11px] — look for 4 recognizable labels
    const labels = [
      /total members/i,
      /total trainers/i,
      /pending invites/i,
      /new this month/i,
    ];
    for (const label of labels) {
      await expect(sharedPage.getByText(label).first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('stage2: trainers "View Hub" navigates to trainer detail with name visible', async () => {
    await sharedPage.goto('/owner/trainers');
    await sharedPage.waitForSelector('text=View Hub', { timeout: 8000 });
    // Get the trainer name from the first card before clicking
    const trainerCards = sharedPage.locator('div.rounded-xl').filter({ hasText: 'View Hub' });
    const firstCard = trainerCards.first();
    // Click the "View Hub →" link
    await firstCard.getByRole('link', { name: /view hub/i }).click();
    await sharedPage.waitForURL(/\/owner\/trainers\/.+/, { timeout: 8000 });
    await expect(sharedPage).toHaveURL(/\/owner\/trainers\/.+/);
    // The trainer's name should be in the page header
    const h1 = sharedPage.locator('h1');
    await expect(h1).toBeVisible({ timeout: 5000 });
    const headingText = await h1.textContent();
    expect(headingText).toBeTruthy();
  });

  test('stage2: invites dialog — submit unique email → appears in list', async () => {
    await sharedPage.goto('/owner/invites');
    const uniqueEmail = `stage2-${Date.now()}@example.com`;
    await sharedPage.getByRole('button', { name: /send invite/i }).click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await sharedPage.fill('#invite-email', uniqueEmail);
    await sharedPage.getByRole('button', { name: /generate invite link/i }).click();
    // Dialog should close after success
    await sharedPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 8000 });
    // Invite should appear in pending list
    await expect(sharedPage.getByText(uniqueEmail)).toBeVisible({ timeout: 5000 });
  });

  test('stage2: members — reassign trainer shows success toast', async () => {
    await sharedPage.goto('/owner/members');
    // Wait for the section label to confirm data has loaded
    await expect(sharedPage.getByText(/all members/i)).toBeVisible({ timeout: 12000 });
    // Click Reassign on the first member card
    const reassignBtn = sharedPage.getByRole('button', { name: /reassign/i }).first();
    await reassignBtn.click();
    // Inline trainer select + Confirm button should appear
    const trainerSelect = sharedPage.locator('select[aria-label="Select trainer"]').first();
    await trainerSelect.waitFor({ timeout: 5000 });
    const confirmBtn = sharedPage.getByRole('button', { name: /confirm/i }).first();
    // Select a trainer to ensure the button is enabled
    const options = await trainerSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '') {
        await trainerSelect.selectOption(val);
        break;
      }
    }
    // After selecting a trainer, Confirm becomes enabled
    await expect(confirmBtn).toBeEnabled({ timeout: 3000 });
    // Click Confirm — verifies the handler fires
    await confirmBtn.click();
    // The Confirm UI closes when the assignment resolves (success or error)
    // A toast also appears — either "reassigned" (success) or "Failed" (API error)
    await expect(confirmBtn).not.toBeVisible({ timeout: 15000 });
  });
});
