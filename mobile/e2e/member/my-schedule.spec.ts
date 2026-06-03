/**
 * Member My Schedule E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/my-schedule
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /scheduled-sessions/dev/seed endpoint available (dev mode only)
 *
 * A fresh member email is seeded per run. Sessions are pre-seeded via the dev
 * endpoint so the member's read-only list is populated from the start.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = `member-schedule-${Date.now()}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// A fixed future date (well beyond test run date) and a fixed past date
const FUTURE_DATE = '2030-12-15T00:00:00.000Z';
const PAST_DATE = '2020-03-10T00:00:00.000Z';

describe('Member: My Schedule read-only view', () => {
  describe('golden path: member with seeded sessions', () => {
    beforeAll(async () => {
      // Seed the member account
      await fetch(`${API_URL}/auth/dev/seed-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: MEMBER_EMAIL,
          password: MEMBER_PASSWORD,
          role: 'member',
        }),
      });

      // Seed one future and one past session for this member
      await fetch(`${API_URL}/scheduled-sessions/dev/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberEmail: MEMBER_EMAIL,
          sessions: [
            {
              date: FUTURE_DATE,
              startTime: '10:00',
              endTime: '11:00',
              customServiceName: 'Strength Training',
              status: 'scheduled',
            },
            {
              date: PAST_DATE,
              startTime: '09:00',
              endTime: '10:00',
              customServiceName: 'Cardio',
              status: 'scheduled',
            },
          ],
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

      // Navigate to My Schedule via drawer
      await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
      await element(by.id('drawer-hamburger')).tap();
      await waitFor(element(by.id('drawer-item-MySchedule'))).toBeVisible().withTimeout(10000);
      await element(by.id('drawer-item-MySchedule')).tap();
      await waitFor(element(by.id('screen-MySchedule'))).toBeVisible().withTimeout(10000);
    });

    it('shows the upcoming section with the future session visible', async () => {
      await waitFor(element(by.id('schedule-upcoming-section'))).toBeVisible().withTimeout(10000);

      // Future session should be visible (10:00 – 11:00 time range)
      await waitFor(element(by.text('10:00 – 11:00'))).toBeVisible().withTimeout(10000);
    });

    it('shows the past section with the past session visible', async () => {
      await waitFor(element(by.id('schedule-past-section'))).toBeVisible().withTimeout(10000);

      // Past session should be visible (09:00 – 10:00 time range)
      await waitFor(element(by.text('09:00 – 10:00'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('empty state: member with no sessions', () => {
    const EMPTY_MEMBER_EMAIL = `member-schedule-empty-${Date.now()}@powergym.com`;

    beforeAll(async () => {
      // Seed the member account with no sessions
      await fetch(`${API_URL}/auth/dev/seed-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: EMPTY_MEMBER_EMAIL,
          password: MEMBER_PASSWORD,
          role: 'member',
        }),
      });
    });

    beforeEach(async () => {
      await device.clearKeychain();
      await device.setBiometricEnrollment(false);
      await device.launchApp({ newInstance: true });
      await device.disableSynchronization();

      // Log in as the empty member
      await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
      await element(by.id('login-email-input')).typeText(EMPTY_MEMBER_EMAIL);
      await element(by.id('login-password-input')).typeText(MEMBER_PASSWORD);
      await element(by.id('login-sign-in-button')).tap();

      // Navigate to My Schedule via drawer
      await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
      await element(by.id('drawer-hamburger')).tap();
      await waitFor(element(by.id('drawer-item-MySchedule'))).toBeVisible().withTimeout(10000);
      await element(by.id('drawer-item-MySchedule')).tap();
      await waitFor(element(by.id('screen-MySchedule'))).toBeVisible().withTimeout(10000);
    });

    it('shows both upcoming and past empty states when there are no sessions', async () => {
      await waitFor(element(by.id('schedule-upcoming-empty'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('schedule-past-empty'))).toBeVisible();
    });
  });
});
