/**
 * Owner Training Templates E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/training-templates
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /exercises/dev/seed-global endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account per run (empty templates list)
 *   - A global exercise so the picker is never empty
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-templates-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const EXERCISE_NAME = `Bench Press ${TS}`;
const TEMPLATE_NAME = `Test Template ${TS}`;

describe('Owner: Training Templates', () => {
  beforeAll(async () => {
    // Seed owner account
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
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

    // Log in as owner
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Training Templates via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-TrainingTemplates'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-TrainingTemplates')).tap();
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create template → detail → edit → delete', async () => {
    // Tap + Create button
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    // Enter template name
    await element(by.id('template-name-input')).typeText(TEMPLATE_NAME);

    // Add a day
    await element(by.id('add-day-button')).tap();

    // Add an exercise to day 0
    await element(by.id('add-exercise-button-0')).tap();

    // Wait for exercise picker and search
    await waitFor(element(by.id('exercise-picker'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id(`exercise-result-${EXERCISE_NAME}`))).toBeVisible().withTimeout(10000);
    // Select the exercise
    await element(by.id(`exercise-result-${EXERCISE_NAME}`)).tap();

    // Wait for form to resume with exercise added
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    // Fill sets and reps
    // (inputs are inside the day card — fill by placeholder text or scroll to them)
    await waitFor(element(by.label(`Sets for ${EXERCISE_NAME}`))).toBeVisible().withTimeout(5000);
    await element(by.label(`Sets for ${EXERCISE_NAME}`)).typeText('3');
    await element(by.label(`Min reps for ${EXERCISE_NAME}`)).typeText('8');
    await element(by.label(`Max reps for ${EXERCISE_NAME}`)).typeText('12');

    // Save
    await waitFor(element(by.id('template-save-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('template-save-button')).tap();

    // Should return to list with new card
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(TEMPLATE_NAME))).toBeVisible().withTimeout(10000);

    // Tap the card to open detail
    await element(by.text(TEMPLATE_NAME)).tap();
    await waitFor(element(by.id('screen-TrainingTemplateDetail'))).toBeVisible().withTimeout(10000);

    // Detail shows day and exercise
    await detoxExpect(element(by.text('Day 1'))).toBeVisible();
    await detoxExpect(element(by.text(EXERCISE_NAME))).toBeVisible();
    await detoxExpect(element(by.text('3 × 8–12'))).toBeVisible();

    // Tap edit
    await element(by.id('template-edit-button')).tap();
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    // Change template name
    await element(by.id('template-name-input')).clearText();
    await element(by.id('template-name-input')).typeText(`${TEMPLATE_NAME} Edited`);
    await element(by.id('template-save-button')).tap();

    // Detail shows updated name
    await waitFor(element(by.id('screen-TrainingTemplateDetail'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(`${TEMPLATE_NAME} Edited`))).toBeVisible();

    // Go back to list
    await element(by.id('screen-header-back')).tap();
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);

    // Re-open to delete
    await element(by.text(`${TEMPLATE_NAME} Edited`)).tap();
    await waitFor(element(by.id('screen-TrainingTemplateDetail'))).toBeVisible().withTimeout(10000);

    // Tap delete button
    await element(by.id('template-delete-button')).tap();

    // Confirm deletion
    await waitFor(element(by.id('template-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('template-delete-confirm')).tap();

    // Should return to list with card gone
    await waitFor(element(by.id('screen-TrainingTemplates'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(`${TEMPLATE_NAME} Edited`))).not.toBeVisible();
  });

  it('error case: save button is disabled when name is empty', async () => {
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-TrainingTemplateForm'))).toBeVisible().withTimeout(10000);

    // Save button must be disabled when name is empty
    await detoxExpect(element(by.id('template-save-button'))).not.toBeEnabled();
  });
});
