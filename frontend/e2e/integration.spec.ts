import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

test.describe.configure({ mode: 'serial' });

const BASE_URL = 'http://localhost:5173';
// API calls go through the Vite proxy at the frontend origin so auth cookies apply
const API_BASE = 'http://localhost:5173';
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
  let newMemberId: string;

  // Step 1: Owner creates a member invite and assigns them to trainer@test.com
  test('owner creates a member invite assigned to trainer → invite appears in list', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/owner-integration.json', baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto('/owner/invites');
    uniqueEmail = `e2e-member-${Date.now()}@test.com`;

    await page.getByRole('button', { name: /invite/i }).click();
    await page.fill('input[name="recipientEmail"]', uniqueEmail);

    // Select member role
    await page.selectOption('select[name="role"]', 'member');

    // Assign to trainer by selecting the first non-empty option in the trainer dropdown
    const trainerSelect = page.locator('select[name="trainerId"]');
    const hasTrainerSelect = await trainerSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasTrainerSelect) {
      const options = await trainerSelect.locator('option').all();
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        if (val && val !== '') {
          await trainerSelect.selectOption(val);
          break;
        }
      }
    }

    await page.getByRole('button', { name: /send invite/i }).click();
    await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 8000 });

    // Retrieve invite token directly from MongoDB
    inviteToken = getInviteToken(uniqueEmail);

    await ctx.close();
  });

  // Step 2: New user registers via invite token → lands on /member
  test('new user registers via invite token → lands on /member', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto(`/register?token=${inviteToken}`);
    await page.fill('#firstName', 'Integration');
    await page.fill('#lastName', 'Member');
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/member', { timeout: 15000 });
    await expect(page).toHaveURL('/member');

    await ctx.close();
  });

  // Step 3: Trainer assigns a training plan to the new member (via page.evaluate + fetch)
  test('trainer assigns plan to new member → plan is active', async ({ browser }) => {
    const trainerCtx = await browser.newContext({ storageState: 'e2e/.auth/trainer-integration.json', baseURL: BASE_URL });
    const trainerPage = await trainerCtx.newPage();

    // Navigate to trigger token refresh
    await trainerPage.goto('/trainer/members');
    await trainerPage.waitForSelector('nav', { timeout: 15000 });

    // Use page.evaluate to call API with a fresh access token via the refresh endpoint
    const result = await trainerPage.evaluate(async (targetEmail: string) => {
      const refreshRes = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refreshRes.ok) return { ok: false, error: `refresh failed: ${refreshRes.status}` };
      const { access_token: accessToken } = await refreshRes.json() as { access_token: string };
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };

      const membersRes = await fetch('/api/v1/members', { headers, credentials: 'include' });
      if (!membersRes.ok) return { ok: false, error: `members fetch failed: ${membersRes.status}` };
      const members = await membersRes.json() as Array<{ _id: string; email: string }>;
      if (!Array.isArray(members)) return { ok: false, error: 'members not array' };

      const newMember = members.find((m) => m.email === targetEmail);
      if (!newMember) return { ok: false, error: `member ${targetEmail} not found` };

      const plansRes = await fetch('/api/v1/plan-templates', { headers, credentials: 'include' });
      if (!plansRes.ok) return { ok: false, error: `plans fetch failed: ${plansRes.status}` };
      let plans = await plansRes.json() as Array<{ _id: string }>;

      if (!plans.length) {
        // Create a minimal plan with a day but no exercises (valid per DTO)
        const createRes = await fetch('/api/v1/plan-templates', {
          method: 'POST', headers, credentials: 'include',
          body: JSON.stringify({
            name: 'Integration Test Plan',
            days: [{ dayNumber: 1, name: 'Day 1', exercises: [] }],
          }),
        });
        if (!createRes.ok) return { ok: false, error: `plan create failed: ${createRes.status}` };
        plans = [await createRes.json()];
      }

      const assignRes = await fetch(`/api/v1/members/${newMember._id}/plan`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ templateId: plans[0]._id }),
      });
      return { ok: assignRes.ok, memberId: newMember._id, error: assignRes.ok ? null : `assign failed: ${assignRes.status}` };
    }, uniqueEmail);

    if (!result.ok) console.error('Step 3 API error:', result.error);
    expect(result.ok).toBe(true);
    if (result.memberId) newMemberId = result.memberId as string;

    await trainerCtx.close();
  });

  // Step 4: New member logs in and can start a session
  test('new member navigates to my-training and can start a session', async ({ browser }) => {
    // Log in as the new member
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();

    await page.goto('/login');
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
    await expect(page).toHaveURL('/member');

    await page.goto('/member/my-training');
    await page.waitForSelector('h1', { timeout: 8000 });

    // The heading must render
    await expect(page.getByRole('heading', { name: /my training/i })).toBeVisible();

    // Start Session button should be present (plan was just assigned)
    const startBtn = page.getByRole('button', { name: /start session/i });
    const hasStartBtn = await startBtn.isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasStartBtn).toBe(true);

    // Start the session and verify session page loads
    await startBtn.click();
    await page.waitForURL(/\/member\/my-training\/session\//, { timeout: 10000 });

    // Session page should render a heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });

    // Fill weight and reps if exercises are present (plan may have empty exercises)
    const weightInput = page.locator('input[placeholder="Weight (kg)"]').first();
    const hasWeightInput = await weightInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasWeightInput) {
      await weightInput.fill('60');
      await weightInput.blur();
      const repsInput = page.locator('input[placeholder="Reps"]').first();
      await repsInput.fill('8');
      await repsInput.blur();
    }

    // Complete the session
    const completeBtn = page.getByRole('button', { name: /complete session/i });
    await completeBtn.waitFor({ timeout: 5000 });
    await completeBtn.click();

    // "Session Complete" confirmation must be visible
    await expect(page.getByText(/session complete/i)).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });
});
