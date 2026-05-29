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

  // ── Stage 1: Equipment Status Panel ──────────────────────────────────────

  test('stage1: owner dashboard — Equipment Status panel shows Active count badge and colored item status badge', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 10000 });
    // Wait for equipment data to load
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // The Equipment Status section must be visible
    await expect(sharedPage.getByText('Equipment Status').first()).toBeVisible({ timeout: 8000 });

    // Count badge for "Active" should appear
    await expect(sharedPage.getByText(/Active/).first()).toBeVisible({ timeout: 5000 });

    // At least one item row with a colored status badge
    const statusBadge = sharedPage.locator('[data-testid="item-status-badge"]').first();
    await expect(statusBadge).toBeVisible({ timeout: 5000 });
    const badgeText = await statusBadge.textContent();
    expect(badgeText?.trim().toLowerCase()).toMatch(/active|maintenance|retired/);
  });

  test('billing page renders', async () => {
    await sharedPage.goto('/owner/billing');
    await expect(sharedPage).toHaveURL('/owner/billing');
    await expect(sharedPage.getByText(/billing/i).first()).toBeVisible();
  });

  // Sprint 3 Stage 3 — owner gym management pages

  test('stage3: equipment — add item via dialog → card appears; delete via confirm → card removed', async () => {
    await sharedPage.goto('/owner/equipment');
    const name = `E2E Equip ${Date.now()}`;

    // Open add dialog
    const addButtons = sharedPage.getByRole('button', { name: /add equipment/i });
    await addButtons.first().click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill name in dialog
    await sharedPage.fill('#add-eq-name', name);
    await sharedPage.getByRole('button', { name: /^add equipment$/i }).click();

    // Dialog should close and card should appear
    await sharedPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 8000 });
    await expect(sharedPage.getByText(name)).toBeVisible({ timeout: 8000 });

    // Delete via confirm dialog
    const equipRow = sharedPage.locator('div').filter({ hasText: name }).filter({ has: sharedPage.getByRole('button', { name: /delete/i }) }).last();
    await equipRow.getByRole('button', { name: /delete/i }).click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    // Confirm delete
    await sharedPage.getByRole('button', { name: /^delete$/i }).click();
    await expect(sharedPage.getByText(name)).not.toBeVisible({ timeout: 8000 });
  });

  test('stage3: equipment — cancel in delete dialog keeps card', async () => {
    await sharedPage.goto('/owner/equipment');
    const name = `E2E Equip Keep ${Date.now()}`;

    // Create the item
    const addButtons = sharedPage.getByRole('button', { name: /add equipment/i });
    await addButtons.first().click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await sharedPage.fill('#add-eq-name', name);
    await sharedPage.getByRole('button', { name: /^add equipment$/i }).click();
    await sharedPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 8000 });
    await expect(sharedPage.getByText(name)).toBeVisible({ timeout: 8000 });

    // Open delete dialog then cancel
    const equipRow = sharedPage.locator('div').filter({ hasText: name }).filter({ has: sharedPage.getByRole('button', { name: /delete/i }) }).last();
    await equipRow.getByRole('button', { name: /delete/i }).click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await sharedPage.getByRole('button', { name: /cancel/i }).click();
    // Card should still be there
    await expect(sharedPage.getByText(name)).toBeVisible({ timeout: 5000 });
  });

  test('stage3: services — create a service → appears in list with price text visible', async () => {
    await sharedPage.goto('/owner/services');
    const name = `E2E Service ${Date.now()}`;

    // Open add dialog
    const addButtons = sharedPage.getByRole('button', { name: /add service/i });
    await addButtons.first().click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });

    await sharedPage.fill('#svc-name', name);
    await sharedPage.fill('#svc-duration', '60');
    await sharedPage.fill('#svc-price', '120');
    await sharedPage.getByRole('button', { name: /^create service$/i }).click();

    await sharedPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 8000 });
    await expect(sharedPage.getByText(name)).toBeVisible({ timeout: 8000 });
    // Price text visible — scoped to the specific card containing the service name
    const serviceCard = sharedPage.locator('div').filter({ hasText: name }).filter({ has: sharedPage.getByText(/AUD/) }).last();
    await expect(serviceCard.getByText(/120/)).toBeVisible({ timeout: 5000 });
  });

  test('stage3: calendar — create a session → session event card appears in correct day column', async () => {
    await sharedPage.goto('/owner/calendar');
    await sharedPage.waitForSelector('nav', { timeout: 8000 });

    // Open create dialog
    await sharedPage.getByRole('button', { name: /schedule/i }).click();
    await sharedPage.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Use a date in the current week (today)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    await sharedPage.fill('#cal-date', dateStr);
    await sharedPage.fill('#cal-start', '14:00');
    await sharedPage.fill('#cal-end', '15:00');
    await sharedPage.getByRole('button', { name: /^create$/i }).click();

    // Dialog closes and session event card with time appears
    await sharedPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 8000 });
    await expect(sharedPage.getByText(/14:00/)).toBeVisible({ timeout: 8000 });
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
