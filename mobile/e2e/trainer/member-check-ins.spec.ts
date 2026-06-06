/**
 * Trainer Member Check-ins E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-check-ins
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds a trainer with one seeded member. The seed endpoint with seedMembers: true
 * always creates exactly one check-in for the seeded member (see auth.dev.controller.ts).
 * There is no dev-seed path to create a member without a check-in — the check-in is
 * created atomically alongside the member in seedMembersData().
 *
 * EDGE CASE SUBSTITUTION: Because it is impossible to seed a member without a check-in
 * via the dev endpoint, the edge case uses the "tab re-render" substitution: switch away
 * from the Check-ins tab and switch back, then assert the list re-renders without error
 * (the check-in row is still visible and the screen has not crashed).
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-checkins-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Member Check-ins flow', () => {
  beforeAll(async () => {
    // Seed a trainer with one member; seedMembers: true also creates one check-in
    // for that member automatically.
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

    // Navigate to the Check-ins tab
    await element(by.id('member-detail-tab-checkins')).tap();
  });

  it('golden path: Check-ins tab shows a check-in row → tap it → CheckInDetail screen is visible', async () => {
    // The seeded member has exactly one check-in — its row should be visible
    await waitFor(element(by.id(/^member-checkin-item-/))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id(/^member-checkin-item-/))).toBeVisible();

    // Tap the check-in row to open the detail screen
    await element(by.id(/^member-checkin-item-/)).tap();
    await waitFor(element(by.id('screen-CheckInDetail'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('screen-CheckInDetail'))).toBeVisible();
  });

  it('edge case (tab re-render substitution): switching tabs and returning to Check-ins re-renders without error', async () => {
    // Confirm the check-in row is present before leaving
    await waitFor(element(by.id(/^member-checkin-item-/))).toBeVisible().withTimeout(8000);

    // Switch away to the Overview tab
    await element(by.id('member-detail-tab-overview')).tap();

    // Switch back to Check-ins
    await element(by.id('member-detail-tab-checkins')).tap();

    // The check-in row must still be visible — no crash, no empty state
    await waitFor(element(by.id(/^member-checkin-item-/))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id(/^member-checkin-item-/))).toBeVisible();
  });
});
