/**
 * Trainer Foods E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/foods
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh trainer account per run (empty foods list at start)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-foods-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const FOOD_NAME = `Brown Rice ${TS}`;
const EDITED_FOOD_NAME = `Brown Rice Edited ${TS}`;

describe('Trainer: Foods management', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD, role: 'trainer' }),
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

    // Navigate to Foods screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Foods'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Foods')).tap();
    await waitFor(element(by.id('foods-add-button'))).toBeVisible().withTimeout(10000);
  });

  it('drawer navigation: drawer-item-Foods is visible and tappable for trainer', async () => {
    await detoxExpect(element(by.id('foods-add-button'))).toBeVisible();
    await detoxExpect(element(by.id('foods-search-input'))).toBeVisible();
  });

  it('golden path: add food → edit name → delete, each state change asserted', async () => {
    // ── Add a new food ──────────────────────────────────────────────────────────
    await element(by.id('foods-add-button')).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    await element(by.id('food-name-input')).typeText(FOOD_NAME);
    await element(by.id('food-kcal-input')).typeText('130');
    await element(by.id('food-protein-input')).typeText('2.7');
    await element(by.id('food-carbs-input')).typeText('28');
    await element(by.id('food-fat-input')).typeText('1');

    await element(by.id('food-save-button')).tap();

    // Food name is visible in the list
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(FOOD_NAME))).toBeVisible().withTimeout(10000);

    // ── Tap card to edit ────────────────────────────────────────────────────────
    await element(by.text(FOOD_NAME)).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    // Verify it pre-filled
    await detoxExpect(element(by.id('food-name-input'))).toHaveValue(FOOD_NAME);

    // Change the name
    await element(by.id('food-name-input')).clearText();
    await element(by.id('food-name-input')).typeText(EDITED_FOOD_NAME);

    await element(by.id('food-save-button')).tap();

    // Edited name is visible
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(EDITED_FOOD_NAME))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(FOOD_NAME))).not.toBeVisible();

    // ── Delete the food ─────────────────────────────────────────────────────────
    await element(by.id(/^food-delete-/)).tap();

    await waitFor(element(by.id('food-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('food-delete-confirm')).tap();

    // Food is no longer visible
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(EDITED_FOOD_NAME))).not.toBeVisible();
  });
});
