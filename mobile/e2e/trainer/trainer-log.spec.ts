/**
 * Trainer Log Session E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/trainer-log
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /training/dev/seed endpoint available (dev mode only)
 *
 * Seeding assumptions:
 * - Seeding a trainer with seedMembers: true creates a member with email
 *   `seed-members-member-for-{TRAINER_EMAIL}` and sets member.User.trainerId
 *   to the trainer's user id (confirmed in AuthDevController.seedMembersData).
 * - The trainer's token is used to create a plan template (trainers have
 *   owner|trainer access to POST /plan-templates).
 * - /training/dev/seed accepts any user email as ownerEmail — it looks up the
 *   user by email regardless of role, so the trainer email works as ownerEmail.
 *   This assigns the template to the seeded member.
 *
 * Golden path:
 *   Trainer logs in → Members → member card → Training tab →
 *   taps log-session-day-1 → TrainerWorkoutSession screen →
 *   fills reps + weight inputs → taps log-set button → logged indicator appears →
 *   taps finish-workout-button → returns to screen-MemberDetail
 *
 * Edge case:
 *   A member with no active plan shows no log-session-day-1 button on Training tab.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-log-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
// Member email is determined by seedMembersData in AuthDevController
const MEMBER_EMAIL = `seed-members-member-for-${TRAINER_EMAIL}`;

// Trainer for the no-plan edge case
const NOPLAN_TRAINER_EMAIL = `trainer-noplan-${TS}@powergym.com`;
const NOPLAN_TRAINER_PASSWORD = 'TrainerPass123!';
const NOPLAN_MEMBER_EMAIL = `seed-members-member-for-${NOPLAN_TRAINER_EMAIL}`;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// The exerciseId used when creating the template — stored here for testID construction
// Use regex matchers in tests to avoid hard-coding the id.

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

async function navigateToMembers() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Members')).tap();
  await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
}

describe('Trainer: Log Session for Member', () => {
  beforeAll(async () => {
    // Seed trainer with a member assigned to them
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

    // Log in as the trainer to get a token for creating a plan template
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    // Create a training template with one non-bodyweight exercise
    const tplRes = await fetch(`${API_URL}/plan-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Trainer Log E2E Plan',
        description: null,
        days: [
          {
            dayNumber: 1,
            name: 'Day 1 - Push',
            exercises: [
              {
                groupId: 'g1',
                isSuperset: false,
                exerciseId: '000000000000000000000001',
                exerciseName: 'Bench Press',
                imageUrl: null,
                isBodyweight: false,
                sets: 2,
                repsMin: 8,
                repsMax: 12,
                restSeconds: 90,
              },
            ],
          },
        ],
      }),
    });
    const template = (await tplRes.json()) as { _id: string };

    // Assign the template to the seeded member via the dev seed endpoint.
    // ownerEmail here is the trainer's email — the dev endpoint looks up the user
    // by email without role checking, so this works to satisfy the seed endpoint.
    await fetch(`${API_URL}/training/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: MEMBER_EMAIL,
        ownerEmail: TRAINER_EMAIL,
        templateId: template._id,
        seedCompletedSession: false,
      }),
    });

    // Seed a second trainer with a member but NO training plan (edge case)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: NOPLAN_TRAINER_EMAIL,
        password: NOPLAN_TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });
  });

  describe('golden path: trainer logs a session for a member', () => {
    beforeEach(async () => {
      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMembers();
    });

    it('opens member → Training tab → logs a set → finishes → returns to MemberDetail', async () => {
      // Open the seeded member's detail
      await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
      await element(by.id(/^member-card-/)).tap();
      await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

      // Navigate to Training tab
      await element(by.id('member-detail-tab-training')).tap();

      // The Log Session button for day 1 should be visible
      await waitFor(element(by.id('log-session-day-1'))).toBeVisible().withTimeout(10000);
      await element(by.id('log-session-day-1')).tap();

      // TrainerWorkoutSession screen should appear
      await waitFor(element(by.id('screen-TrainerWorkoutSession'))).toBeVisible().withTimeout(10000);

      // Use regex to find the first set row without knowing the exact exerciseId
      await waitFor(element(by.id(/^workout-set-/))).toBeVisible().withTimeout(10000);

      // Fill reps input for set 1
      await element(by.id(/^set-reps-.*-1$/)).tap();
      await element(by.id(/^set-reps-.*-1$/)).typeText('10');

      // Fill weight input for set 1 (non-bodyweight exercise)
      await element(by.id(/^set-weight-.*-1$/)).tap();
      await element(by.id(/^set-weight-.*-1$/)).typeText('80');

      // Tap the Log Set button
      await element(by.id(/^log-set-.*-1$/)).tap();

      // Logged indicator should appear
      await waitFor(element(by.id(/^set-logged-.*-1$/))).toBeVisible().withTimeout(8000);

      // Finish the workout
      await element(by.id('finish-workout-button')).tap();

      // Should return to MemberDetail screen
      await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('edge case: member with no active plan shows no Log Session button', () => {
    beforeEach(async () => {
      await loginAs(NOPLAN_TRAINER_EMAIL, NOPLAN_TRAINER_PASSWORD);
      await navigateToMembers();
    });

    it('Training tab shows no log-session-day-1 when member has no plan', async () => {
      // Open the seeded member's detail
      await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
      await element(by.id(/^member-card-/)).tap();
      await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

      // Navigate to Training tab
      await element(by.id('member-detail-tab-training')).tap();

      // Wait for the tab to settle (history load completes)
      await waitFor(element(by.id('member-detail-tab-training'))).toBeVisible().withTimeout(5000);

      // No log session day button should be present
      await detoxExpect(element(by.id('log-session-day-1'))).not.toBeVisible();
    });
  });
});
