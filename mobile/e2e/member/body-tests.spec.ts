/**
 * Member Body Tests E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/body-tests
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /body-tests/dev/seed-for-user endpoint available (dev mode only)
 *
 * A fresh member email is seeded per run. Body test data is pre-seeded via the
 * dev API so the member's read-only list is populated from the start.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = `member-bodytests-${Date.now()}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Member: Body Tests read-only view', () => {
  beforeAll(async () => {
    // Seed the member account
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD, role: 'member' }),
    });

    // Seed a body test for this member via the dev endpoint
    await fetch(`${API_URL}/body-tests/dev/seed-for-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL }),
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

    // Navigate to Body Tests screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-BodyTests'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-BodyTests')).tap();
    await waitFor(element(by.id('screen-BodyTests'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: seeded body test card is visible and opens detail without delete button', async () => {
    // The seeded body test card must be visible
    await waitFor(element(by.id(/^body-test-card-/))).toBeVisible().withTimeout(10000);

    // Tap the card to view the detail
    await element(by.id(/^body-test-card-/)).tap();
    await waitFor(element(by.id('screen-BodyTestDetail'))).toBeVisible().withTimeout(10000);

    // Delete button must NOT be present for a member
    await detoxExpect(element(by.id('bodytest-delete-button'))).not.toBeVisible();
  });

  it('member access: Body Tests screen has no add ("+") button', async () => {
    // The add button must not exist on the member Body Tests screen
    await detoxExpect(element(by.id('bodytests-add-button'))).not.toBeVisible();
  });
});
