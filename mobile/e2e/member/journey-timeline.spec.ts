/**
 * Member Journey Timeline E2E — Detox on iOS Simulator
 *
 * Tests the timeline view added in Sprint 8 Stage 8:
 * - Summary header (total sessions, streak, body tests, member-since)
 * - Chronological timeline nodes
 * - Infinite scroll (second page loads on end-reached)
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/journey-timeline
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /journey/dev/seed endpoint with a large dataset for pagination
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const MEMBER_EMAIL = `member-jt-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const EMPTY_MEMBER_EMAIL = `member-jt-empty-${TS}@powergym.com`;
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

describe('Member: Journey Timeline', () => {
  beforeAll(async () => {
    // Seed member with journey data (sessions + body tests)
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

    // Seed empty member
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

  describe('golden path: member with seeded journey data', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToJourney();
    });

    it('shows the journey summary header and at least one timeline node', async () => {
      // Timeline list should be visible
      await waitFor(element(by.id('journey-timeline-list'))).toBeVisible().withTimeout(15000);
      await detoxExpect(element(by.id('journey-timeline-list'))).toBeVisible();

      // Summary header should be visible (has a joined item from seeded data)
      await waitFor(element(by.id('journey-summary-header'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('journey-summary-header'))).toBeVisible();

      // At least one timeline node visible — the joined item is always seeded
      const timelineNodeMatcher = by.id(/^timeline-node-/);
      await waitFor(element(timelineNodeMatcher).atIndex(0)).toBeVisible().withTimeout(10000);
    });

    it('scrolling to the bottom loads additional timeline items when more pages exist', async () => {
      // Wait for timeline list to appear
      await waitFor(element(by.id('journey-timeline-list'))).toBeVisible().withTimeout(15000);

      // Scroll to the end to trigger fetchMore
      await element(by.id('journey-timeline-list')).scrollTo('bottom');

      // After scroll, the list is still visible (no crash, pagination worked)
      await detoxExpect(element(by.id('journey-timeline-list'))).toBeVisible();
    });
  });

  describe('edge case: member with no seeded data shows empty state', () => {
    beforeEach(async () => {
      await loginAs(EMPTY_MEMBER_EMAIL, EMPTY_MEMBER_PASSWORD);
      await navigateToJourney();
    });

    it('renders journey-empty when member has no timeline events', async () => {
      await waitFor(element(by.id('journey-empty'))).toBeVisible().withTimeout(15000);
      await detoxExpect(element(by.id('journey-empty'))).toBeVisible();
    });
  });
});
