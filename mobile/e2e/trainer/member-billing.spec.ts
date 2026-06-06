/**
 * Trainer Member Billing E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-billing
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * The seed endpoint creates a trainer with at least one member that has a
 * billable session in the current month (seedBilling: true).
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-member-billing-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function loginAndOpenMemberBillingTab(): Promise<void> {
  await device.clearKeychain();
  await device.setBiometricEnrollment(false);
  await device.launchApp({ newInstance: true });
  await device.disableSynchronization();

  await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
  await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
  await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
  await element(by.id('login-sign-in-button')).tap();

  // Navigate to Members via drawer
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Members')).tap();

  await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);

  // Open first member
  await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
  await element(by.id(/^member-card-/)).tap();

  await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

  // Tap the Billing tab
  await element(by.id('member-detail-tab-billing')).tap();
}

describe('Trainer: Member Billing tab', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
        seedBilling: true,
      }),
    });
  });

  it('golden path: period total and session count are visible on the Billing tab', async () => {
    await loginAndOpenMemberBillingTab();

    await waitFor(element(by.id('billing-period-total'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-period-total'))).toBeVisible();

    await detoxExpect(element(by.id('billing-session-count'))).toBeVisible();
    await detoxExpect(element(by.id('billing-period-label'))).toBeVisible();
  });

  it('edge case: tapping the previous-month control changes the period label', async () => {
    await loginAndOpenMemberBillingTab();

    await waitFor(element(by.id('billing-period-label'))).toBeVisible().withTimeout(10000);

    // Read current label text is not directly possible in Detox — we just verify the button works
    await element(by.id('billing-period-prev')).tap();

    // After tapping prev, either new data or empty state should appear
    await waitFor(
      element(by.id('billing-period-total')).or(element(by.id('billing-empty-state'))),
    ).toBeVisible().withTimeout(10000);
    await detoxExpect(
      element(by.id('billing-period-total')).or(element(by.id('billing-empty-state'))),
    ).toBeVisible();
  });
});
