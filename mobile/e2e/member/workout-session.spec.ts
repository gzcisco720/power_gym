/**
 * Member Workout Session E2E — Detox on iOS Simulator
 *
 * Tests Stage 7: elapsed timer, RPE prompt, add/delete sets.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/workout-session
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /training/dev/seed endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-ws-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const MEMBER_EMAIL = `member-ws-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

let firstExerciseId = '';

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

async function navigateToMyTraining() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-MyTraining'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-MyTraining')).tap();
  await waitFor(element(by.id('screen-MyTraining'))).toBeVisible().withTimeout(10000);
}

describe('Member: Workout Session (Stage 7)', () => {
  beforeAll(async () => {
    // Seed owner
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD, role: 'owner' }),
    });

    // Seed member
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD, role: 'member' }),
    });

    // Owner login to create template
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    // Create training template
    const tplRes = await fetch(`${API_URL}/plan-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name: 'Session Stage 7 Plan',
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
    const template = (await tplRes.json()) as {
      _id: string;
      days: Array<{ exercises: Array<{ exerciseId: string }> }>;
    };
    firstExerciseId = template.days[0].exercises[0].exerciseId;

    // Seed training plan for member
    await fetch(`${API_URL}/training/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: MEMBER_EMAIL,
        ownerEmail: OWNER_EMAIL,
        templateId: template._id,
        seedCompletedSession: false,
      }),
    });
  });

  describe('golden path: add set, finish with RPE', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToMyTraining();
    });

    it('taps day 1 → sees elapsed timer → taps Add Set → new set row appears', async () => {
      await waitFor(element(by.id('workout-day-1'))).toBeVisible().withTimeout(10000);
      await element(by.id('workout-day-1')).tap();

      await waitFor(element(by.id('screen-WorkoutSession'))).toBeVisible().withTimeout(10000);

      // Elapsed timer must be visible in the header
      await detoxExpect(element(by.id('elapsed-timer'))).toBeVisible();

      // Two prescribed set rows visible
      const setRowId1 = `workout-set-${firstExerciseId}-1`;
      const setRowId2 = `workout-set-${firstExerciseId}-2`;
      await waitFor(element(by.id(setRowId1))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id(setRowId2))).toBeVisible();

      // Tap Add Set for the exercise group
      const addSetId = `add-set-${firstExerciseId}`;
      await element(by.id(addSetId)).tap();

      // A third set row should appear (set 3)
      const setRowId3 = `workout-set-${firstExerciseId}-3`;
      await waitFor(element(by.id(setRowId3))).toBeVisible().withTimeout(10000);

      // The extra set should have a delete button
      const deleteSetId = `delete-set-${firstExerciseId}-3`;
      await detoxExpect(element(by.id(deleteSetId))).toBeVisible();
    });

    it('taps Finish Workout → RPE sheet appears → selects RPE → returns to training screen', async () => {
      await waitFor(element(by.id('workout-day-1'))).toBeVisible().withTimeout(10000);
      await element(by.id('workout-day-1')).tap();

      await waitFor(element(by.id('screen-WorkoutSession'))).toBeVisible().withTimeout(10000);

      // Tap Finish Workout — should open RPE sheet
      await element(by.id('finish-workout-button')).tap();

      // RPE sheet should appear
      await waitFor(element(by.id('rpe-sheet'))).toBeVisible().withTimeout(10000);

      // Select RPE 8
      await element(by.id('rpe-button-8')).tap();

      // Confirm
      await element(by.id('rpe-confirm-button')).tap();

      // Should navigate back to My Training
      await waitFor(element(by.id('screen-MyTraining'))).toBeVisible().withTimeout(10000);
    });
  });
});
