/**
 * Member Check-In E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/check-in
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * A fresh member email is seeded per run so the weekly slot is always empty
 * at the start of the golden path.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = `member-checkin-${Date.now()}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Member: Check-In flow', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD, role: 'member' }),
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

    // Navigate to Check-In screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-CheckIn'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-CheckIn')).tap();
    await waitFor(element(by.id('checkin-start-button'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: submit check-in and see submitted status + history row', async () => {
    // Tap start button to open the form
    await element(by.id('checkin-start-button')).tap();
    await waitFor(element(by.id('screen-CheckInForm'))).toBeVisible().withTimeout(10000);

    // Sliders default to 5 — no interaction needed for wellness
    // Select "Yes" for stuck to diet (required field)
    await element(by.id('checkin-diet-yes')).tap();

    // Submit the form
    await element(by.id('checkin-form-submit-button')).tap();

    // Wait for success message on the form screen
    await waitFor(element(by.text('Check-in submitted!'))).toBeVisible().withTimeout(10000);

    // Wait for automatic navigation back to CheckInScreen
    await waitFor(element(by.id('checkin-submitted-label'))).toBeVisible().withTimeout(10000);

    // Assert submitted status is visible
    await detoxExpect(element(by.id('checkin-submitted-label'))).toBeVisible();

    // Assert at least one history row is visible.
    // Each row has accessibilityLabel "Check-in from <date>" — match by label regex.
    await waitFor(element(by.label(/Check-in from/))).toBeVisible().withTimeout(5000);
  });

  it('error case: after submitting this week, start button is disabled', async () => {
    // ── First submit a check-in ───────────────────────────────────────────────
    await element(by.id('checkin-start-button')).tap();
    await waitFor(element(by.id('screen-CheckInForm'))).toBeVisible().withTimeout(10000);

    await element(by.id('checkin-diet-yes')).tap();
    await element(by.id('checkin-form-submit-button')).tap();

    // Wait for navigation back to CheckInScreen showing submitted state
    await waitFor(element(by.id('checkin-submitted-label'))).toBeVisible().withTimeout(10000);

    // ── The start button must no longer be present / tappable ─────────────────
    // After submission hasCheckedInThisWeek() is true — CheckInScreen renders
    // the "Submitted ✓" label instead of the start button.
    await detoxExpect(element(by.id('checkin-start-button'))).not.toBeVisible();
  });

  it('history row shows diet badge after submitting a check-in with stuckToDiet=yes', async () => {
    // Submit a check-in with "yes" diet selection
    await element(by.id('checkin-start-button')).tap();
    await waitFor(element(by.id('screen-CheckInForm'))).toBeVisible().withTimeout(10000);

    await element(by.id('checkin-diet-yes')).tap();
    await element(by.id('checkin-form-submit-button')).tap();

    // Wait for navigation back to CheckInScreen
    await waitFor(element(by.id('checkin-submitted-label'))).toBeVisible().withTimeout(10000);

    // At least one history row must show the diet badge
    // The badge for stuckToDiet=yes is "On track"
    await waitFor(element(by.text('On track'))).toBeVisible().withTimeout(8000);
    await detoxExpect(element(by.text('On track'))).toBeVisible();
  });
});
