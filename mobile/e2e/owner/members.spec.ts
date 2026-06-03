/**
 * Owner Members E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/members
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds an owner with one member that has a body test, active injury, and active medication.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = `owner-members-${Date.now()}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Members management', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
        seedMembers: true,
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

    // Navigate to Members screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: seeded member card visible → tap → detail header → Overview tab → Body Tests tab → Health tab', async () => {
    // Seeded member card should be visible
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);

    // Tap the member card to open detail
    await element(by.id(/^member-card-/)).tap();
    await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

    // Overview tab shows last-body-test date (default active tab)
    await waitFor(element(by.id('overview-last-body-test'))).toBeVisible().withTimeout(5000);

    // Switch to Body Tests tab
    await element(by.id('member-detail-tab-bodytests')).tap();
    await waitFor(element(by.id(/^body-test-card-/))).toBeVisible().withTimeout(10000);

    // Switch to Health tab
    await element(by.id('member-detail-tab-health')).tap();
    // Seeded injury and medication should be visible
    await waitFor(element(by.text('Test Injury'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text('Test Medication'))).toBeVisible().withTimeout(10000);
  });

  it('search edge: typing non-matching string hides member card; clearing restores it', async () => {
    // Seeded member card visible initially
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);

    // Type a non-matching search string
    await element(by.id('members-search-input')).typeText('xyznotamatch');
    await waitFor(element(by.id(/^member-card-/))).not.toBeVisible().withTimeout(5000);

    // Clear the search
    await element(by.id('members-search-input')).clearText();
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(5000);
  });
});
