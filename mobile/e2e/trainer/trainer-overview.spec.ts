/**
 * Trainer Overview Tab E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/trainer-overview
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - An owner account (the test user)
 *   - A trainer with one assigned member (seeded via seedMembers)
 *   - A trainer with zero assigned members (for zero-state case)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-trainer-overview-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const TRAINER_EMAIL = `trainer-overview-with-member-${TS}@powergym.com`;
const TRAINER_NO_SESSIONS_EMAIL = `trainer-overview-nosessions-${TS}@powergym.com`;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Trainer Overview Tab', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
    });

    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: 'TrainerPass123!',
        role: 'trainer',
        seedMembers: true,
      }),
    });

    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_NO_SESSIONS_EMAIL,
        password: 'TrainerPass123!',
        role: 'trainer',
      }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Trainers'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Trainers')).tap();
    await waitFor(element(by.id('screen-Trainers'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: owner opens trainer detail Overview tab → 6 KPI cells, weekly schedule chart, and 6-month trend chart are all visible', async () => {
    await waitFor(element(by.id(/^trainer-row-/))).toBeVisible().withTimeout(10000);
    await element(by.id(/^trainer-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('screen-TrainerDetail'))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.id('trainer-detail-tab-overview'))).toBeVisible().withTimeout(5000);

    await waitFor(element(by.id('kpi-memberCount'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('kpi-sessionsThisMonth'))).toBeVisible();
    await detoxExpect(element(by.id('kpi-templateCount'))).toBeVisible();
    await detoxExpect(element(by.id('kpi-activeMembersThisMonth'))).toBeVisible();
    await detoxExpect(element(by.id('kpi-newPRsThisMonth'))).toBeVisible();
    await detoxExpect(element(by.id('kpi-avgStreakDays'))).toBeVisible();

    await detoxExpect(element(by.id('schedule-bar-Mon'))).toBeVisible();
    await detoxExpect(element(by.id('schedule-bar-Sun'))).toBeVisible();

    await detoxExpect(element(by.text('Sessions Trend'))).toBeVisible();
  });

  it('edge case: trainer with no sessions → Overview tab shows zeros and charts render without crashing', async () => {
    await waitFor(element(by.id(/^trainer-row-/))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.text('0 members'))).toBeVisible().withTimeout(10000);
    await element(by.text('0 members')).tap();

    await waitFor(element(by.id('screen-TrainerDetail'))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.id('kpi-memberCount'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text('0'))).toBeVisible().withTimeout(5000);

    await detoxExpect(element(by.id('schedule-bar-Mon'))).toBeVisible();
    await detoxExpect(element(by.id('schedule-bar-Sun'))).toBeVisible();
  });
});
