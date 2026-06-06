/**
 * Owner Foods E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/foods
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account per run (empty foods list at start)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-foods-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const FOOD_NAME = `Chicken Breast ${TS}`;
const EDITED_FOOD_NAME = `Chicken Breast Edited ${TS}`;

describe('Owner: Foods management', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD, role: 'owner' }),
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

    // Navigate to Foods screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Foods'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Foods')).tap();
    await waitFor(element(by.id('foods-add-button'))).toBeVisible().withTimeout(10000);
  });

  it('drawer navigation: drawer-item-Foods is visible and leads to Foods screen', async () => {
    await detoxExpect(element(by.id('foods-add-button'))).toBeVisible();
    await detoxExpect(element(by.id('foods-search-input'))).toBeVisible();
  });

  it('golden path: add food → appears in list → tap card → edit name → save → list shows edited name', async () => {
    // ── Add a new food ──────────────────────────────────────────────────────────
    await element(by.id('foods-add-button')).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    await element(by.id('food-name-input')).typeText(FOOD_NAME);
    await element(by.id('food-kcal-input')).typeText('165');
    await element(by.id('food-protein-input')).typeText('31');
    await element(by.id('food-carbs-input')).typeText('0');
    await element(by.id('food-fat-input')).typeText('3.6');

    await element(by.id('food-save-button')).tap();

    // Returns to list — new food name is visible
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(FOOD_NAME))).toBeVisible().withTimeout(10000);

    // ── Tap card to open edit form ──────────────────────────────────────────────
    await element(by.text(FOOD_NAME)).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    // Verify name is pre-filled
    await detoxExpect(element(by.id('food-name-input'))).toHaveValue(FOOD_NAME);

    // ── Edit the name ───────────────────────────────────────────────────────────
    await element(by.id('food-name-input')).clearText();
    await element(by.id('food-name-input')).typeText(EDITED_FOOD_NAME);

    await element(by.id('food-save-button')).tap();

    // Returns to list — edited name is visible
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(EDITED_FOOD_NAME))).toBeVisible().withTimeout(10000);
  });

  it('delete: tap delete button → confirm dialog → food no longer visible', async () => {
    // First create a food to delete
    await element(by.id('foods-add-button')).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    const deleteFoodName = `To Delete ${TS}`;
    await element(by.id('food-name-input')).typeText(deleteFoodName);
    await element(by.id('food-kcal-input')).typeText('100');
    await element(by.id('food-protein-input')).typeText('10');
    await element(by.id('food-carbs-input')).typeText('10');
    await element(by.id('food-fat-input')).typeText('5');
    await element(by.id('food-save-button')).tap();

    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(deleteFoodName))).toBeVisible().withTimeout(10000);

    // Tap delete button on the food card (match by regex since id includes the food's _id)
    await element(by.id(/^food-delete-/)).tap();

    // Confirm delete
    await waitFor(element(by.id('food-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('food-delete-confirm')).tap();

    // Food is no longer visible
    await waitFor(element(by.id('screen-Foods'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(deleteFoodName))).not.toBeVisible();
  });

  it('error case: Save button is disabled when name is empty', async () => {
    await element(by.id('foods-add-button')).tap();
    await waitFor(element(by.id('screen-FoodForm'))).toBeVisible().withTimeout(10000);

    // Save button should be disabled when name is empty (form untouched)
    await detoxExpect(element(by.id('food-save-button'))).not.toBeEnabled();

    // Fill only macros — save still disabled without name
    await element(by.id('food-kcal-input')).typeText('100');
    await element(by.id('food-protein-input')).typeText('10');
    await element(by.id('food-carbs-input')).typeText('10');
    await element(by.id('food-fat-input')).typeText('5');

    await detoxExpect(element(by.id('food-save-button'))).not.toBeEnabled();
  });
});
