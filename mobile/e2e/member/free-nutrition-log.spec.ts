/**
 * Member Free Nutrition Log E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/free-nutrition-log
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - A food in the foods library (seeded via the owner before running)
 *
 * Seeds:
 *   - A member with NO nutrition plan (so the "Log freely" CTA is shown)
 *   - An owner account to seed a food item in the library
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-freelogtest-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const MEMBER_EMAIL = `member-freelogtest-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const TEST_FOOD_NAME = 'Oats';

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

async function navigateToMyNutrition() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-MyNutrition'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-MyNutrition')).tap();
  await waitFor(element(by.id('screen-MyNutrition'))).toBeVisible().withTimeout(10000);
}

describe('Member: Free Nutrition Log', () => {
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

    // Seed member with no nutrition plan
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        role: 'member',
      }),
    });
  });

  describe('golden path: member with no plan taps "Log freely", searches food, logs it', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('shows the "Log freely" CTA when no plan is assigned', async () => {
      await detoxExpect(element(by.id('screen-MyNutrition'))).toBeVisible();
      await waitFor(element(by.id('my-nutrition-empty'))).toBeVisible().withTimeout(10000);
      await waitFor(element(by.id('log-freely-cta'))).toBeVisible().withTimeout(5000);
    });

    it('taps "Log freely", searches a food, sets quantity, logs it → item appears in list with updated calorie total', async () => {
      await waitFor(element(by.id('log-freely-cta'))).toBeVisible().withTimeout(10000);
      await element(by.id('log-freely-cta')).tap();

      // FreeLog screen appears
      await waitFor(element(by.id('screen-FreeLog'))).toBeVisible().withTimeout(10000);

      // Search for the food
      await waitFor(element(by.id('free-log-food-search'))).toBeVisible().withTimeout(5000);
      await element(by.id('free-log-food-search')).typeText(TEST_FOOD_NAME);

      // Wait for food result and tap it
      await waitFor(element(by.id(`free-food-result-${TEST_FOOD_NAME}`))).toBeVisible().withTimeout(10000);
      await element(by.id(`free-food-result-${TEST_FOOD_NAME}`)).tap();

      // Quantity input appears; enter 80g
      await waitFor(element(by.id('free-log-quantity-input'))).toBeVisible().withTimeout(5000);
      await element(by.id('free-log-quantity-input')).clearText();
      await element(by.id('free-log-quantity-input')).typeText('80');

      // Confirm log
      await element(by.id('free-log-confirm')).tap();

      // The item appears in today's list
      await waitFor(element(by.id('free-log-item-0'))).toBeVisible().withTimeout(10000);

      // The calorie total is visible
      await waitFor(element(by.id('free-log-total-kcal'))).toBeVisible().withTimeout(5000);
    });
  });

  describe('edge case: attempting to log without selecting a food shows validation', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('taps Log freely, then taps Log Food without a selection → shows validation message and no item added', async () => {
      await waitFor(element(by.id('log-freely-cta'))).toBeVisible().withTimeout(10000);
      await element(by.id('log-freely-cta')).tap();

      await waitFor(element(by.id('screen-FreeLog'))).toBeVisible().withTimeout(10000);

      // Tap confirm without selecting a food
      await element(by.id('free-log-confirm')).tap();

      // Validation text should appear (contains "select a food")
      await waitFor(element(by.text('Please select a food first.'))).toBeVisible().withTimeout(5000);

      // No logged items
      await detoxExpect(element(by.id('free-log-item-0'))).not.toBeVisible();
    });
  });
});
