/**
 * Trainer Training Templates E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/training-templates
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /exercises/dev/seed-global endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh trainer account per run (empty templates list)
 *   - A global exercise so the picker has at least one result
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-templates-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const EXERCISE_NAME = `Squat ${TS}`;
const TEMPLATE_NAME = `Trainer Template ${TS}`;

describe('Trainer: Training Templates', () => {
  beforeAll(async () => {
    // Seed trainer account
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
      }),
    });

    // Seed a global exercise so the picker has at least one result
    await fetch(`${API_URL}/exercises/dev/seed-global`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: EXERCISE_NAME }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as trainer
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Training Templates via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-TrainingTemplates'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-TrainingTemplates')).tap();
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create template → save → card appears → open detail → edit → updated name shows', async () => {
    // Tap + Create button
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    // Enter template name
    await element(by.id('template-name-input')).typeText(TEMPLATE_NAME);

    // Add a day
    await element(by.id('add-day-button')).tap();

    // Add an exercise to day 0
    await element(by.id('add-exercise-button-0')).tap();

    // Wait for exercise picker
    await waitFor(element(by.id('exercise-picker'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id(`exercise-result-${EXERCISE_NAME}`))).toBeVisible().withTimeout(10000);
    await element(by.id(`exercise-result-${EXERCISE_NAME}`)).tap();

    // Back on form — fill required sets/reps
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.label(`Sets for ${EXERCISE_NAME}`))).toBeVisible().withTimeout(5000);
    await element(by.label(`Sets for ${EXERCISE_NAME}`)).typeText('4');
    await element(by.label(`Min reps for ${EXERCISE_NAME}`)).typeText('6');
    await element(by.label(`Max reps for ${EXERCISE_NAME}`)).typeText('10');

    // Save
    await element(by.id('template-save-button')).tap();

    // Back on list — card appears
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(TEMPLATE_NAME))).toBeVisible().withTimeout(10000);

    // Open detail
    await element(by.text(TEMPLATE_NAME)).tap();
    await waitFor(element(by.id('screen-TrainingTemplateDetail'))).toBeVisible().withTimeout(10000);

    // Edit the template — change name
    await element(by.id('template-edit-button')).tap();
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    await element(by.id('template-name-input')).clearText();
    await element(by.id('template-name-input')).typeText(`${TEMPLATE_NAME} v2`);
    await element(by.id('template-save-button')).tap();

    // Detail header shows updated name
    await waitFor(element(by.id('screen-TrainingTemplateDetail'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(`${TEMPLATE_NAME} v2`))).toBeVisible();
  });
});
