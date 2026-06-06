/**
 * Member Check-In Dashboard E2E — Detox on iOS Simulator
 *
 * Tests the rich check-in sections added in Sprint 8 Stage 4:
 * Achievements, Wellness Breakdown, Body Metrics, Progress Photos, Compare.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/check-in-dashboard
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /check-ins/dev/seed endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const MEMBER_EMAIL = `member-ci-dashboard-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function navigateToCheckIn() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-CheckIn'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-CheckIn')).tap();
  await waitFor(element(by.id('screen-CheckIn'))).toBeVisible().withTimeout(10000);
}

describe('Member: Check-In Dashboard rich sections', () => {
  beforeAll(async () => {
    // Seed a member account
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        role: 'member',
      }),
    });

    // Seed check-in history (3 consecutive weeks, with body metrics + photo on most recent)
    await fetch(`${API_URL}/check-ins/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberEmail: MEMBER_EMAIL }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as member
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(MEMBER_EMAIL);
    await element(by.id('login-password-input')).typeText(MEMBER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
    await navigateToCheckIn();
  });

  it('shows Achievements, Last Check-In Wellness, Body Metrics, Progress Photos, and Compare sections with seeded check-ins', async () => {
    // Achievements section heading
    await waitFor(element(by.text('Achievements'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Achievements'))).toBeVisible();

    // Wellness breakdown section heading
    await waitFor(element(by.text('Last Check-In Wellness'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Last Check-In Wellness'))).toBeVisible();

    // Body Metrics section heading (seeded check-in has weight)
    await waitFor(element(by.text('Body Metrics'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Body Metrics'))).toBeVisible();

    // Progress Photos section heading (seeded check-in has 1 photo)
    await waitFor(element(by.text('Progress Photos'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Progress Photos'))).toBeVisible();

    // Compare section heading (2 check-ins exist)
    await waitFor(element(by.text('Compare'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Compare'))).toBeVisible();
  });

  it('tapping a progress photo thumbnail opens the fullscreen modal and dismissing closes it', async () => {
    // Tap the first photo thumbnail
    await waitFor(element(by.id('progress-photo-0'))).toBeVisible().withTimeout(10000);
    await element(by.id('progress-photo-0')).tap();

    // Fullscreen modal should be visible (the close pressable has accessibilityLabel)
    await waitFor(element(by.label('Close fullscreen photo'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.label('Close fullscreen photo'))).toBeVisible();

    // Dismiss
    await element(by.label('Close fullscreen photo')).tap();
    await waitFor(element(by.label('Close fullscreen photo'))).not.toBeVisible().withTimeout(5000);
  });
});
