/**
 * Trainer Dashboard Navigation E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/dashboard-navigation
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds a trainer with one member. seedMembers: true automatically creates a
 * check-in for the seeded member, so the Pending Check-ins section on the
 * dashboard will contain at least one "Review →" entry.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-dashboard-nav-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer Dashboard: navigation wiring', () => {
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

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('trainer-dashboard'))).toBeVisible().withTimeout(20000);
  });

  it('tapping "Review →" on a pending check-in opens the Check-in Detail screen', async () => {
    // Scroll to find the Pending Check-ins section
    await waitFor(element(by.text('PENDING CHECK-INS')))
      .toBeVisible()
      .whileElement(by.id('trainer-dashboard'))
      .scroll(200, 'down');

    // Tap the Review button on the first pending check-in
    await waitFor(element(by.label('Review →')).atIndex(0))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.label('Review →')).atIndex(0).tap();

    // The Check-in Detail screen should open
    await waitFor(element(by.id('screen-CheckInDetail'))).toBeVisible().withTimeout(15000);
  });

  it('tapping "View all →" under Needs Attention navigates to the Members screen', async () => {
    // The Needs Attention section should be visible (scroll if needed)
    await waitFor(element(by.text('NEEDS ATTENTION')))
      .toBeVisible()
      .whileElement(by.id('trainer-dashboard'))
      .scroll(200, 'down');

    // Tap View all
    await element(by.label('View all needs attention')).tap();

    // Members screen should be shown
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(15000);
  });
});
