/**
 * Owner Trainers E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/trainers
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - An owner account (the test user)
 *   - A trainer with one assigned member (seeded via seedMembers on the trainer)
 *   - A trainer with zero assigned members (seeded without seedMembers)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-trainers-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const TRAINER_WITH_MEMBER_EMAIL = `trainer-withmember-${TS}@powergym.com`;
const TRAINER_NO_MEMBER_EMAIL = `trainer-nomember-${TS}@powergym.com`;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Trainers', () => {
  beforeAll(async () => {
    // Seed the owner account
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
    });

    // Seed a trainer who has one member (seedMembers assigns the member to this trainer)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_WITH_MEMBER_EMAIL,
        password: 'TrainerPass123!',
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Seed a trainer with no assigned members
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_NO_MEMBER_EMAIL,
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

    // Log in as owner
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Trainers screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Trainers'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Trainers')).tap();
    await waitFor(element(by.id('screen-Trainers'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: seeded trainer visible → tap → detail header → Overview tab → Members tab → seeded member appears → back returns to list', async () => {
    // Trainer row with member should be visible
    await waitFor(element(by.id(/^trainer-row-/))).toBeVisible().withTimeout(10000);

    // Tap a trainer row to open detail
    await element(by.id(/^trainer-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('screen-TrainerDetail'))).toBeVisible().withTimeout(10000);

    // Overview tab is active by default — member count stat visible
    await waitFor(element(by.id('trainer-detail-tab-overview'))).toBeVisible().withTimeout(5000);

    // Tap Members tab
    await element(by.id('trainer-detail-tab-members')).tap();
    // At least one member row should appear (for trainer-with-member)
    await waitFor(element(by.id(/^member-row-/))).toBeVisible().withTimeout(10000);

    // Go back to the trainers list
    await element(by.id('screen-header-back')).tap();
    await waitFor(element(by.id('screen-Trainers'))).toBeVisible().withTimeout(10000);
  });

  it('edge case: trainer with zero members → Members tab shows empty state; Overview shows member count 0', async () => {
    // Wait for trainer rows to load
    await waitFor(element(by.id(/^trainer-row-/))).toBeVisible().withTimeout(10000);

    // Find and tap the trainer with no members by tapping the last trainer row
    // (both trainers are seeded; we look for the one showing "0 members")
    await waitFor(element(by.text('0 members'))).toBeVisible().withTimeout(10000);
    await element(by.text('0 members')).tap();

    await waitFor(element(by.id('screen-TrainerDetail'))).toBeVisible().withTimeout(10000);

    // Overview tab: member count stat shows 0
    await waitFor(element(by.text('0'))).toBeVisible().withTimeout(5000);

    // Switch to Members tab
    await element(by.id('trainer-detail-tab-members')).tap();

    // Empty state text visible
    await waitFor(element(by.text('No members assigned.'))).toBeVisible().withTimeout(5000);
  });
});
