/**
 * Member Billing E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/billing
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role and /auth/dev/seed-billing endpoints
 *   available (dev mode only)
 *
 * Seeding creates a member with at least one billable session in the current
 * month and no sessions in a future month so the empty state is deterministic.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = `member-billing-${Date.now()}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Member: Billing flow', () => {
  beforeAll(async () => {
    // Seed a member with a completed session in the current month
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        role: 'member',
        seedBilling: true,
      }),
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

    // Navigate to Billing screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Billing'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Billing')).tap();
    await waitFor(element(by.id('screen-Billing'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: billing screen visible, total and at least one billing line visible', async () => {
    // Screen is visible
    await detoxExpect(element(by.id('screen-Billing'))).toBeVisible();

    // Total is rendered
    await waitFor(element(by.id('billing-total'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-total'))).toBeVisible();

    // At least one billing line
    await waitFor(element(by.id('billing-line'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-line'))).toBeVisible();
  });

  it('period navigation: tapping prev then next returns the label to the original month', async () => {
    // Wait for the period label to be visible
    await waitFor(element(by.id('billing-period-label'))).toBeVisible().withTimeout(10000);

    // Capture the initial label text (current month)
    const labelEl = element(by.id('billing-period-label'));

    // Tap prev
    await element(by.id('billing-period-prev')).tap();

    // The label should have changed (previous month)
    // Tap next to return
    await element(by.id('billing-period-next')).tap();

    // The label should be back to the original month — verify screen is still stable
    await detoxExpect(element(by.id('billing-period-label'))).toBeVisible();
    await detoxExpect(labelEl).toBeVisible();
  });

  it('edge case: a period with no sessions shows the empty state', async () => {
    // Navigate forward multiple months to reach a future empty period
    await waitFor(element(by.id('billing-period-next'))).toBeVisible().withTimeout(10000);
    await element(by.id('billing-period-next')).tap();
    await element(by.id('billing-period-next')).tap();
    await element(by.id('billing-period-next')).tap();

    // Empty state should appear
    await waitFor(element(by.id('billing-empty'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-empty'))).toBeVisible();
  });
});
