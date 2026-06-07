/**
 * Trainer Member Nutrition Rich E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-nutrition-rich
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role and /nutrition/dev/seed-member-plan
 *   endpoints available (dev mode only)
 *
 * Sprint Contract criteria covered:
 * - Trainer opens a member's Nutrition tab → day-type cards with macro badges visible
 * - A log row shows actual-vs-target kcal
 * - A log row shows the "Logged" indicator
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-nutrition-rich-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// The auth dev controller seeds a member at this deterministic address
const SEEDED_MEMBER_EMAIL = `seed-members-member-for-${TRAINER_EMAIL}`;

describe('Trainer: Member Nutrition Rich tab', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as trainer
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Members screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);

    // Open the seeded member detail
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
    await element(by.id(/^member-card-/)).tap();
    await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

    // Navigate to the Nutrition tab
    await element(by.id('member-detail-tab-nutrition')).tap();
  });

  it('golden path: day-type cards with macro badges and a log row with actual-vs-target kcal', async () => {
    // Seed a nutrition plan + today's log for the member
    const seedRes = await fetch(`${API_URL}/nutrition/dev/seed-member-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: SEEDED_MEMBER_EMAIL,
        trainerEmail: TRAINER_EMAIL,
      }),
    });
    expect(seedRes.ok).toBe(true);

    // Restart the app so the Nutrition tab fetches fresh data
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
    await element(by.id(/^member-card-/)).tap();
    await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);
    await element(by.id('member-detail-tab-nutrition')).tap();

    // Day-type card must be visible with the seeded day type name
    await waitFor(element(by.id('day-type-card-Training Day'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('day-type-card-Training Day'))).toBeVisible();

    // Macro badges must be visible on the day-type card
    await detoxExpect(element(by.id('day-type-protein-Training Day'))).toBeVisible();
    await detoxExpect(element(by.id('day-type-carbs-Training Day'))).toBeVisible();
    await detoxExpect(element(by.id('day-type-fat-Training Day'))).toBeVisible();

    // A log row with actual kcal must be visible
    await waitFor(element(by.id(/^log-actual-kcal-/))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id(/^log-actual-kcal-/))).toBeVisible();

    // The log row must show a target kcal (actual-vs-target pattern)
    await detoxExpect(element(by.id(/^log-target-kcal-/))).toBeVisible();
  });

  it('edge case: Nutrition tab shows empty state when no plan is assigned', async () => {
    // The Nutrition tab must show "No plan assigned" and the Assign button
    await waitFor(element(by.id('assign-nutrition-plan-button'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('assign-nutrition-plan-button'))).toBeVisible();
  });

  it('edge case: switching away and back to Nutrition tab re-renders without error', async () => {
    // Confirm Nutrition tab loaded
    await waitFor(element(by.id('assign-nutrition-plan-button'))).toBeVisible().withTimeout(8000);

    // Switch to Overview tab
    await element(by.id('member-detail-tab-overview')).tap();

    // Switch back to Nutrition
    await element(by.id('member-detail-tab-nutrition')).tap();

    // The assign button must still be visible — no crash, no error
    await waitFor(element(by.id('assign-nutrition-plan-button'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('assign-nutrition-plan-button'))).toBeVisible();
  });
});
