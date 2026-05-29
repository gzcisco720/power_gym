import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Owner domain', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/owner.json' });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('owner dashboard renders stats cards', async () => {
    await sharedPage.goto('/owner');
    await sharedPage.waitForSelector('nav', { timeout: 5000 });
    await expect(sharedPage.getByText(/total members/i)).toBeVisible();
  });

  test('member list shows seeded members', async () => {
    await sharedPage.goto('/owner/members');
    await expect(sharedPage.getByText('member@test.com')).toBeVisible({ timeout: 8000 });
  });

  test('invite flow: create invite appears in list', async () => {
    await sharedPage.goto('/owner/invites');
    const uniqueEmail = `e2e-${Date.now()}@test.com`;
    await sharedPage.getByRole('button', { name: /invite/i }).click();
    await sharedPage.fill('input[name="recipientEmail"]', uniqueEmail);
    await sharedPage.getByRole('button', { name: /send invite/i }).click();
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
});
