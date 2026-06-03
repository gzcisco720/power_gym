/**
 * Owner Billing E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/billing
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * The seed endpoint creates an owner with at least one member that has a
 * billable session in the current month.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = `owner-billing-${Date.now()}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Billing flow', () => {
  beforeAll(async () => {
    // Seed an owner with members who have billable sessions this month
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
        seedBilling: true,
      }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as owner
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Billing screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Billing'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Billing')).tap();
    await waitFor(element(by.id('screen-Billing'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: billing screen visible, member rows and grand total visible', async () => {
    // Screen is visible
    await detoxExpect(element(by.id('screen-Billing'))).toBeVisible();

    // Grand total is rendered
    await waitFor(element(by.id('billing-grand-total'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-grand-total'))).toBeVisible();

    // At least one member row
    await waitFor(element(by.id('billing-member-row'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-member-row'))).toBeVisible();
  });

  it('edge case: navigating to a future/empty month shows the empty state', async () => {
    // Navigate forward multiple months to reach a future period with no sessions
    await waitFor(element(by.id('billing-period-next'))).toBeVisible().withTimeout(10000);
    await element(by.id('billing-period-next')).tap();
    await element(by.id('billing-period-next')).tap();
    await element(by.id('billing-period-next')).tap();

    // Empty state should appear
    await waitFor(element(by.id('billing-empty'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('billing-empty'))).toBeVisible();
  });
});
