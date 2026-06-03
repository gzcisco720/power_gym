/**
 * Trainer Members E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/members
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds two trainers — the main one with a seeded member, the other with a different member.
 * Verifies the trainer only sees their own member.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-members-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const OTHER_TRAINER_EMAIL = `other-trainer-members-${Date.now()}@powergym.com`;
const OTHER_TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Members — scoped list', () => {
  beforeAll(async () => {
    // Seed the main trainer with a member
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Seed a second trainer with their own member (to verify isolation)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OTHER_TRAINER_EMAIL,
        password: OTHER_TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as the main trainer
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Members screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: trainer sees only their own seeded member → open detail → Health tab shows medication', async () => {
    // The seeded member card for this trainer should be visible
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);

    // Tap to open detail
    await element(by.id(/^member-card-/)).tap();
    await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

    // Navigate to Health tab and verify medication is visible
    await element(by.id('member-detail-tab-health')).tap();
    await waitFor(element(by.text('Test Medication'))).toBeVisible().withTimeout(10000);
  });

  it('access edge: list does NOT contain a member belonging to the other trainer', async () => {
    // The trainer should only see their own member — not the other trainer's member.
    // The other trainer's seeded member email is predictable: seed-member-for-{OTHER_TRAINER_EMAIL}
    const otherMemberEmail = `seed-member-for-${OTHER_TRAINER_EMAIL}`;

    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);

    // Assert the other trainer's member email text is absent from the list
    await detoxExpect(element(by.text(otherMemberEmail))).not.toBeVisible();
  });
});
