/**
 * Member My Nutrition E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/my-nutrition
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /nutrition/dev/seed endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account + member account per run
 *   - Creates a nutrition template with day types and food items
 *   - Assigns the template to the member via /nutrition/dev/seed
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-nutrition-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const MEMBER_EMAIL = `member-nutrition-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const SEEDED_DAY_TYPE = 'Training Day';
const SEEDED_FOOD_NAME = 'Chicken Breast';

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

describe('Member: My Nutrition', () => {
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

    // Seed member
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        role: 'member',
      }),
    });

    // Seed nutrition plan for the member
    await fetch(`${API_URL}/nutrition/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: MEMBER_EMAIL,
        ownerEmail: OWNER_EMAIL,
        dayTypeName: SEEDED_DAY_TYPE,
        foodName: SEEDED_FOOD_NAME,
      }),
    });
  });

  describe('golden path: view plan → see macros → log food → totals update', () => {
    beforeEach(async () => {
      await loginAs(MEMBER_EMAIL, MEMBER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('sees screen-MyNutrition with macro-summary and day-type label', async () => {
      await detoxExpect(element(by.id('screen-MyNutrition'))).toBeVisible();
      await waitFor(element(by.id('macro-summary'))).toBeVisible().withTimeout(10000);
      await waitFor(element(by.id(`nutrition-day-type-${SEEDED_DAY_TYPE}`))).toBeVisible().withTimeout(10000);
    });

    it('sees at least one meal-card and can log a food item', async () => {
      // Wait for meal cards to load
      await waitFor(element(by.id('meal-card-1'))).toBeVisible().withTimeout(10000);

      // Tap the log food button on the first meal card
      await element(by.id('log-food-button')).atIndex(0).tap();

      // LogFood screen should appear
      await waitFor(element(by.id('screen-LogFood'))).toBeVisible().withTimeout(10000);

      // Food results should be visible (seeded food)
      await waitFor(element(by.id(`food-result-${SEEDED_FOOD_NAME}`))).toBeVisible().withTimeout(10000);

      // Select the food
      await element(by.id(`food-result-${SEEDED_FOOD_NAME}`)).tap();

      // Quantity input should appear; enter 150g
      await waitFor(element(by.id('quantity-input'))).toBeVisible().withTimeout(5000);
      await element(by.id('quantity-input')).clearText();
      await element(by.id('quantity-input')).typeText('150');

      // Confirm the log
      await element(by.id('confirm-log-food')).tap();

      // Should navigate back to My Nutrition
      await waitFor(element(by.id('screen-MyNutrition'))).toBeVisible().withTimeout(10000);

      // macro-summary logged kcal should now be greater than zero
      await waitFor(element(by.id('macro-summary'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('edge case: no plan assigned shows empty state', () => {
    const EMPTY_MEMBER_EMAIL = `member-noplan-nutrition-${TS}@powergym.com`;
    const EMPTY_MEMBER_PASSWORD = 'MemberPass123!';

    beforeAll(async () => {
      // Seed a member with no nutrition plan assigned
      await fetch(`${API_URL}/auth/dev/seed-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: EMPTY_MEMBER_EMAIL,
          password: EMPTY_MEMBER_PASSWORD,
          role: 'member',
        }),
      });
    });

    beforeEach(async () => {
      await loginAs(EMPTY_MEMBER_EMAIL, EMPTY_MEMBER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('shows my-nutrition-empty and no meal-card when no plan assigned', async () => {
      await detoxExpect(element(by.id('screen-MyNutrition'))).toBeVisible();
      await waitFor(element(by.id('my-nutrition-empty'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('meal-card-1'))).not.toBeVisible();
    });
  });
});
