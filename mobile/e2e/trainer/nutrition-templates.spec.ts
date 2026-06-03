/**
 * Trainer Nutrition Templates E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/nutrition-templates
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - Fresh trainer + owner accounts per run
 *   - The owner creates a template that must NOT appear in the trainer's list
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-nutrition-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const OWNER_EMAIL = `owner-nutrition-scope-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const TRAINER_TEMPLATE_NAME = `Trainer Nutrition ${TS}`;
const OWNER_TEMPLATE_NAME = `Owner Nutrition ${TS}`;

describe('Trainer: Nutrition Templates', () => {
  beforeAll(async () => {
    // Seed trainer and owner accounts
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
      }),
    });

    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
    });

    // Create an owner template via the API directly (using owner credentials)
    // We get a token first, then create the template
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    await fetch(`${API_URL}/nutrition-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: OWNER_TEMPLATE_NAME, dayTypes: [] }),
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

    // Navigate to Nutrition Templates via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-NutritionTemplates')).tap();
    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: trainer creates a template and sees only their own templates', async () => {
    // Tap + Create button
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    // Enter template name
    await element(by.id('template-name-input')).typeText(TRAINER_TEMPLATE_NAME);

    // Add a day type
    await element(by.id('add-day-type-button')).tap();

    // Save
    await element(by.id('template-save-button')).tap();

    // Trainer's template appears in list
    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(TRAINER_TEMPLATE_NAME))).toBeVisible().withTimeout(10000);

    // Owner's template should NOT appear in trainer's list
    await detoxExpect(element(by.text(OWNER_TEMPLATE_NAME))).not.toBeVisible();
  });
});
