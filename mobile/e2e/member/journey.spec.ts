/**
 * Member Journey E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/journey
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /journey/dev/seed endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh member account per run
 *   - Creates a finished workout session, a nutrition log for today, and a body test
 *     via /journey/dev/seed (golden path)
 *   - Creates a member with no seeded data (edge case)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const MEMBER_EMAIL = `member-journey-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const EMPTY_MEMBER_EMAIL = `member-journey-empty-${TS}@powergym.com`;
const EMPTY_MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function loginAs(email: string, password: string) {
  await device.clearKeychain();
  await device.setBiometricEnrollment(false);
  await device.launchApp({ newInstance: true });
  await device.disableSynchronization();

  await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
  await element(by.id('login-email-input')).typeText(email);
  await element(by.id('login-password-input')).typeText(password);
  await element(by.id('login-sign-in-button')).tap();

  await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
}

async function navigateToJourney() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Journey'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Journey')).tap();
  await waitFor(element(by.id('screen-Journey'))).toBeVisible().withTimeout(10000);
}

describe('Member: Journey', () => {
  beforeAll(async () => {
    // Seed member with journey data
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        role: 'member',
      }),
    });

    await fetch(`${API_URL}/journey/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberEmail: MEMBER_EMAIL }),
    });

    // Seed member with no journey data
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMPTY_MEMBER_EMAIL,
        password: EMPTY_MEMBER_PASSWORD,
        role: 'member',
      }),
    });
  });

  describe('golden path: member with sessions + nutrition + body test', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToJourney();
    });

    it('opens drawer → taps Journey → screen-Journey is visible', async () => {
      await detoxExpect(element(by.id('screen-Journey'))).toBeVisible();
    });

    it('renders journey-streak, at least one session row, and at least one body test row', async () => {
      // Streak counter
      await waitFor(element(by.id('journey-streak'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('journey-streak'))).toBeVisible();

      // At least one session row — testID prefix is journey-session-
      await waitFor(element(by.id('journey-streak'))).toBeVisible().withTimeout(10000);
      // Check at least one session row exists (exact ID depends on seeded data, so check by label)
      const sessionMatcher = by.id(/^journey-session-/);
      await waitFor(element(sessionMatcher).atIndex(0)).toBeVisible().withTimeout(10000);

      // At least one body test row
      const bodyTestMatcher = by.id(/^journey-body-test-/);
      await waitFor(element(bodyTestMatcher).atIndex(0)).toBeVisible().withTimeout(10000);
    });
  });

  describe('edge case: member with no seeded data shows empty state', () => {
    beforeEach(async () => {
      await loginAs(EMPTY_MEMBER_EMAIL, EMPTY_MEMBER_PASSWORD);
      await navigateToJourney();
    });

    it('renders screen-Journey and journey-empty when member has no data', async () => {
      await detoxExpect(element(by.id('screen-Journey'))).toBeVisible();
      await waitFor(element(by.id('journey-empty'))).toBeVisible().withTimeout(10000);
    });
  });
});
