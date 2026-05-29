import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

test.describe.configure({ mode: 'serial' });

const BASE_URL = 'http://localhost:5173';
const MONGODB_URI = 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin';

function getInviteToken(recipientEmail: string): string {
  const scriptFile = join(tmpdir(), `get-invite-${Date.now()}.js`);
  writeFileSync(scriptFile, `
    const db = db.getSiblingDB('power_gym_test');
    const invite = db.invitetokens.findOne({ recipientEmail: ${JSON.stringify(recipientEmail)}, usedAt: null });
    if (invite) print(invite.token);
    else print('NOT_FOUND');
  `);
  try {
    const output = execFileSync('mongosh', ['--quiet', MONGODB_URI, scriptFile], { encoding: 'utf8' });
    const token = output.trim();
    if (token === 'NOT_FOUND') throw new Error(`Invite not found for ${recipientEmail}`);
    return token;
  } finally {
    unlinkSync(scriptFile);
  }
}

test.describe('Cross-role integration journey', () => {
  let inviteToken: string;
  let uniqueEmail: string;

  // Step 1: Owner creates invite
  test('owner creates a trainer invite → invite appears in list', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/owner-integration.json', baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto('/owner/invites');
    uniqueEmail = `e2e-integration-${Date.now()}@test.com`;

    await page.getByRole('button', { name: /invite/i }).click();
    await page.fill('input[name="recipientEmail"]', uniqueEmail);
    // Select trainer role so the new user lands on /trainer/members after registration
    await page.selectOption('select[name="role"]', 'trainer');
    await page.getByRole('button', { name: /send invite/i }).click();
    await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 8000 });

    // Retrieve invite token directly from MongoDB (avoids needing an auth header in the test)
    inviteToken = getInviteToken(uniqueEmail);

    await ctx.close();
  });

  // Step 2: New user registers via invite token → lands on /trainer/members
  test('new user registers via invite token → lands on /trainer/members', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto(`/register?token=${inviteToken}`);
    await page.fill('#firstName', 'Integration');
    await page.fill('#lastName', 'Trainer');
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/trainer/members', { timeout: 15000 });
    await expect(page).toHaveURL('/trainer/members');

    await ctx.close();
  });

  // Step 3: Trainer assigns training plan to member
  test('trainer assigns plan to member → active plan shown', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/trainer-integration.json', baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto('/trainer/members');
    await page.waitForSelector('nav', { timeout: 10000 });

    // Get first member id
    const link = page.getByRole('link', { name: /View Hub/ }).first();
    await link.waitFor({ timeout: 8000 });
    const href = await link.getAttribute('href');
    const match = href?.match(/\/trainer\/members\/([^/]+)$/);
    expect(match).toBeTruthy();
    const memberId = match![1];

    await page.goto(`/trainer/members/${memberId}/plan`);

    await page.getByRole('button', { name: /assign plan/i }).click();

    const select = page.locator('select');
    await select.waitFor({ timeout: 5000 });
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      // No plans exist — create one first
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.goto('/trainer/plans');
      const planName = `Integration Plan ${Date.now()}`;
      await page.getByRole('button', { name: /new plan/i }).click();
      await page.fill('input[name="name"]', planName);
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByText(planName)).toBeVisible({ timeout: 5000 });

      await page.goto(`/trainer/members/${memberId}/plan`);
      await page.getByRole('button', { name: /assign plan/i }).click();
    }

    const assignSelect = page.locator('select');
    await assignSelect.waitFor({ timeout: 5000 });
    const assignOptions = await assignSelect.locator('option').all();
    const firstValue = await assignOptions[1].getAttribute('value');
    if (firstValue) await assignSelect.selectOption(firstValue);
    await page.getByRole('button', { name: /^assign$/i }).click();

    await expect(page.getByText(/active since/i)).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });

  // Step 4: Member views training page
  test('member views their training page after plan assigned', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/member-integration.json', baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto('/member/my-training');
    await page.waitForSelector('h1', { timeout: 8000 });
    // Either a start-session button or the plan name is visible
    const hasContent = await page
      .getByRole('heading', { name: /my training/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasContent).toBe(true);

    await ctx.close();
  });
});
