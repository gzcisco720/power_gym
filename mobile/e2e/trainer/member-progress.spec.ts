/**
 * Trainer Member Progress E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-progress
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /journey/dev/seed endpoint available (dev mode only)
 *
 * SEEDING STRATEGY:
 * - POST /auth/dev/seed-user-role with { role: 'trainer', seedMembers: true }
 *   creates a trainer + one member (email: seed-members-member-for-<trainerEmail>).
 *   The member has NO completed workout sessions at this point → empty state.
 * - POST /journey/dev/seed with { memberEmail: <memberEmail> } creates a completed
 *   WorkoutSession with one exercise set (Squat, 100kg × 6 reps, completedAt: now),
 *   which populates the heatmap and the exercises list.
 *
 * EDGE CASE: A member with no completed sessions (before journey seed is called)
 * shows the "No training activity yet." empty state. Because the auth seed always
 * creates a member without sessions, this is directly testable — we seed a second
 * trainer with a member and do NOT call journey/dev/seed for that member.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-progress-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

// Edge case: a second trainer whose member has NO completed sessions
const TRAINER_EDGE_EMAIL = `trainer-progress-edge-${Date.now()}@powergym.com`;
const TRAINER_EDGE_PASSWORD = 'TrainerPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// Derived member email from the auth dev seed logic (see auth.dev.controller.ts)
const MEMBER_EMAIL = `seed-members-member-for-${TRAINER_EMAIL}`;

describe('Trainer: Member Progress tab', () => {
  beforeAll(async () => {
    // Seed main trainer with a member
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

    // Seed the member's completed workout session so the heatmap is populated
    await fetch(`${API_URL}/journey/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberEmail: MEMBER_EMAIL }),
    });

    // Seed edge-case trainer with a member but NO journey seed — empty state
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EDGE_EMAIL,
        password: TRAINER_EDGE_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });
  });

  async function loginAndOpenProgressTab(
    email: string,
    password: string,
  ): Promise<void> {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('login-email-input')).typeText(email);
    await element(by.id('login-password-input')).typeText(password);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-Members')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();

    await waitFor(element(by.id('screen-Members')))
      .toBeVisible()
      .withTimeout(10000);

    await waitFor(element(by.id(/^member-card-/)))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id(/^member-card-/)).tap();

    await waitFor(element(by.id('screen-MemberDetail')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('member-detail-tab-progress')).tap();
  }

  beforeEach(async () => {
    // Each test sets up its own session via loginAndOpenProgressTab
  });

  it('golden path: heatmap cell and exercise pill are visible → tap pill → history session with Est. 1RM appears', async () => {
    await loginAndOpenProgressTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // At least one heatmap cell must be visible (today's session was seeded)
    await waitFor(element(by.id(/^progress-heatmap-cell-/)))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id(/^progress-heatmap-cell-/))).toBeVisible();

    // At least one exercise pill must be visible (Squat seeded via journey/dev/seed)
    await waitFor(element(by.id(/^progress-exercise-pill-/)))
      .toBeVisible()
      .withTimeout(8000);

    // Tap the first exercise pill to load history
    await element(by.id(/^progress-exercise-pill-/)).tap();

    // A history session card must appear with the Est. 1RM text
    await waitFor(element(by.id(/^progress-history-session-/)))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id(/^progress-history-session-/))).toBeVisible();

    // The session card must contain the "Est. 1RM" label
    await detoxExpect(element(by.text(/Est\. 1RM/))).toBeVisible();
  });

  it('edge case: member with no completed sessions shows "No training activity yet." empty state', async () => {
    await loginAndOpenProgressTab(TRAINER_EDGE_EMAIL, TRAINER_EDGE_PASSWORD);

    await waitFor(element(by.id('progress-empty-state')))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id('progress-empty-state'))).toBeVisible();
    await detoxExpect(element(by.text('No training activity yet.'))).toBeVisible();
  });
});
