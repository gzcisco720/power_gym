/**
 * Trainer My Training E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/my-training
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /training/dev/seed endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account + trainer account per run
 *   - Creates a training template via the owner's API token
 *   - Assigns the template to the trainer via /training/dev/seed
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-training-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const TRAINER_EMAIL = `trainer-training-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
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

async function navigateToMyTraining() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-MyTraining'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-MyTraining')).tap();
  await waitFor(element(by.id('screen-MyTraining'))).toBeVisible().withTimeout(10000);
}

// We store the exercise ID for testID construction
let firstExerciseId = '';

describe('Trainer: My Training', () => {
  beforeAll(async () => {
    // Seed owner
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
    });

    // Seed trainer
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
      }),
    });

    // Owner logs in to get a token for creating a template
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
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
        name: 'E2E Trainer Plan',
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
    const template = (await tplRes.json()) as { _id: string; days: Array<{ exercises: Array<{ exerciseId: string }> }> };
    firstExerciseId = template.days[0].exercises[0].exerciseId;

    // Seed the training plan for the trainer (memberEmail = TRAINER_EMAIL assigns to trainer)
    await fetch(`${API_URL}/training/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: TRAINER_EMAIL,
        ownerEmail: OWNER_EMAIL,
        templateId: template._id,
        seedCompletedSession: false,
      }),
    });
  });

  describe('golden path: view plan → tap day → log set → finish', () => {
    beforeEach(async () => {
      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMyTraining();
    });

    it('sees workout-day-1 on My Training screen', async () => {
      await detoxExpect(element(by.id('screen-MyTraining'))).toBeVisible();
      await waitFor(element(by.id('workout-day-1'))).toBeVisible().withTimeout(10000);
    });

    it('taps day 1 → WorkoutSession screen → logs a set → finishes workout → returns to MyTraining', async () => {
      await waitFor(element(by.id('workout-day-1'))).toBeVisible().withTimeout(10000);
      await element(by.id('workout-day-1')).tap();

      // WorkoutSession screen should be visible
      await waitFor(element(by.id('screen-WorkoutSession'))).toBeVisible().withTimeout(10000);

      // The first set row
      const setRowId = `workout-set-${firstExerciseId}-1`;
      await waitFor(element(by.id(setRowId))).toBeVisible().withTimeout(10000);

      // Fill reps input
      const repsInputId = `set-reps-${firstExerciseId}-1`;
      await element(by.id(repsInputId)).tap();
      await element(by.id(repsInputId)).typeText('10');

      // Fill weight input (non-bodyweight exercise)
      const weightInputId = `set-weight-${firstExerciseId}-1`;
      await element(by.id(weightInputId)).tap();
      await element(by.id(weightInputId)).typeText('80');

      // Tap Log Set button
      const logButtonId = `log-set-${firstExerciseId}-1`;
      await element(by.id(logButtonId)).tap();

      // The logged indicator should appear
      const loggedId = `set-logged-${firstExerciseId}-1`;
      await waitFor(element(by.id(loggedId))).toBeVisible().withTimeout(10000);

      // Tap Finish Workout
      await element(by.id('finish-workout-button')).tap();

      // Should navigate back to My Training
      await waitFor(element(by.id('screen-MyTraining'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('edge case: no plan assigned shows empty state', () => {
    const EMPTY_TRAINER_EMAIL = `trainer-noplan-${TS}@powergym.com`;
    const EMPTY_TRAINER_PASSWORD = 'TrainerPass123!';

    beforeAll(async () => {
      // Seed a trainer with no plan assigned
      await fetch(`${API_URL}/auth/dev/seed-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: EMPTY_TRAINER_EMAIL,
          password: EMPTY_TRAINER_PASSWORD,
          role: 'trainer',
        }),
      });
    });

    beforeEach(async () => {
      await loginAs(EMPTY_TRAINER_EMAIL, EMPTY_TRAINER_PASSWORD);
      await navigateToMyTraining();
    });

    it('shows my-training-empty and no workout-day-1 when no plan assigned', async () => {
      await detoxExpect(element(by.id('screen-MyTraining'))).toBeVisible();
      await waitFor(element(by.id('my-training-empty'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('workout-day-1'))).not.toBeVisible();
    });
  });
});
