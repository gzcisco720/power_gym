/**
 * Member Drawer Role-Gating E2E — Detox on iOS Simulator
 *
 * Verifies that a logged-in member sees only member nav items in the drawer
 * and that owner/trainer-only items (Trainers, Equipment) are absent.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/drawer
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = 'member-drawer@powergym.com';
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Member: drawer role-gating', () => {
  beforeAll(async () => {
    // seed-user always creates a member role account
    await fetch(`${API_URL}/auth/dev/seed-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD }),
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

    // Open the drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(10000);
  });

  it('OVERVIEW group with Dashboard item is visible in the member drawer', async () => {
    await detoxExpect(element(by.id('drawer-item-Dashboard'))).toBeVisible();
  });

  it('drawer does not contain Trainers or Equipment items (owner-only nav)', async () => {
    await detoxExpect(element(by.id('drawer-item-Trainers'))).not.toBeVisible();
    await detoxExpect(element(by.id('drawer-item-Equipment'))).not.toBeVisible();
  });

  it('member drawer shows member-specific items: Journey, My Training', async () => {
    await detoxExpect(element(by.id('drawer-item-Journey'))).toBeVisible();
    await detoxExpect(element(by.id('drawer-item-MyTraining'))).toBeVisible();
  });
});
