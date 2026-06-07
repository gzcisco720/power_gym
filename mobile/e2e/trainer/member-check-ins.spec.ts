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
 * - The backend /check-ins/dev/seed endpoint available (dev mode only)
 *
 * Seeds two trainers:
 * - TRAINER_EMAIL: has one seeded member with 1 check-in (< 2 → no charts)
 * - TRAINER2_EMAIL: has one seeded member with 1+3=4 check-ins (≥ 2 → charts visible)
 *
 * The seeded member email for each trainer is derived from the dev controller:
 *   seed-members-member-for-<TRAINER_EMAIL>
 *
 * SCHEDULE FORM: Tests saving a schedule via the form. The save button is only enabled
 * when a field changes (dirty). The test changes the hour and taps Save.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-checkins-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const TRAINER2_EMAIL = `trainer-checkins2-${TS}@powergym.com`;
const TRAINER2_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// Email of the seeded member under TRAINER2 — derived from auth.dev.controller.ts pattern
const SEEDED_MEMBER2_EMAIL = `seed-members-member-for-${TRAINER2_EMAIL}`;

describe('Trainer: Member Check-ins flow', () => {
  beforeAll(async () => {
    // Trainer 1: seeded member gets exactly 1 check-in (from seedMembers) → < 2 check-ins
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

    // Trainer 2: seeded member starts with 1 check-in, then gets 3 more → 4 total (≥ 2)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER2_EMAIL,
        password: TRAINER2_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Add 3 more check-ins for TRAINER2's member → total 4 check-ins
    await fetch(`${API_URL}/check-ins/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberEmail: SEEDED_MEMBER2_EMAIL }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  async function loginAndNavigateToCheckInsTab(email: string, password: string) {
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(email);
    await element(by.id('login-password-input')).typeText(password);
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
  }

  it('golden path: Check-ins tab shows a check-in row → tap it → CheckInDetail screen is visible', async () => {
    await loginAndNavigateToCheckInsTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // The seeded member has exactly one check-in — its row should be visible
    await waitFor(element(by.id(/^member-checkin-item-/))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id(/^member-checkin-item-/))).toBeVisible();

    // Tap the check-in row to open the detail screen
    await element(by.id(/^member-checkin-item-/)).tap();
    await waitFor(element(by.id('screen-CheckInDetail'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('screen-CheckInDetail'))).toBeVisible();
  });

  it('schedule form: changing the hour and tapping Save stores the schedule', async () => {
    await loginAndNavigateToCheckInsTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // The schedule form is always visible — wait for it
    await waitFor(element(by.id('schedule-save-button'))).toBeVisible().withTimeout(8000);

    // Change the hour input to make the form dirty
    await element(by.id('schedule-hour-input')).clearText();
    await element(by.id('schedule-hour-input')).typeText('8');

    // Save button should now be enabled and tappable
    await waitFor(element(by.id('schedule-save-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('schedule-save-button')).tap();

    // After save, navigate away and back to verify persistence
    await element(by.id('member-detail-tab-overview')).tap();
    await element(by.id('member-detail-tab-checkins')).tap();

    // Form should be visible again with the saved value
    await waitFor(element(by.id('schedule-hour-input'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('schedule-hour-input'))).toHaveText('8');
  });

  it('member with ≥2 check-ins shows wellness chart and diet heatmap', async () => {
    await loginAndNavigateToCheckInsTab(TRAINER2_EMAIL, TRAINER2_PASSWORD);

    // TRAINER2's member has 4 check-ins (≥ 2) — both charts must be visible
    await waitFor(element(by.id('wellness-trend-chart'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('wellness-trend-chart'))).toBeVisible();

    await waitFor(element(by.id('diet-compliance-heatmap'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('diet-compliance-heatmap'))).toBeVisible();
  });

  it('member with <2 check-ins shows neither wellness chart nor diet heatmap', async () => {
    await loginAndNavigateToCheckInsTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // TRAINER's member has exactly 1 check-in (< 2) — neither chart should exist
    await waitFor(element(by.id(/^member-checkin-item-/))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.id('wellness-trend-chart'))).not.toBeVisible();
    await detoxExpect(element(by.id('diet-compliance-heatmap'))).not.toBeVisible();
  });
});
