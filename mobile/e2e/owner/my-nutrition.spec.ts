/**
 * Owner My Nutrition E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/my-nutrition
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /nutrition/dev/seed endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account per run
 *   - Creates a nutrition template with a Training Day + Chicken Breast food item
 *   - Assigns the template to the owner via /nutrition/dev/seed
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-nutrition-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
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

describe('Owner: My Nutrition', () => {
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

    // Get access token for authenticated requests
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    // Create nutrition template
    const templateRes = await fetch(`${API_URL}/nutrition-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'E2E Owner Nutrition Plan',
        dayTypes: [
          {
            name: SEEDED_DAY_TYPE,
            meals: [
              {
                name: 'Breakfast',
                order: 1,
                items: [
                  {
                    foodName: SEEDED_FOOD_NAME,
                    quantityG: 200,
                    kcal: 330,
                    protein: 62,
                    carbs: 0,
                    fat: 7,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
    const { _id: templateId } = (await templateRes.json()) as { _id: string };

    // Assign the template to the owner (memberEmail === ownerEmail)
    await fetch(`${API_URL}/nutrition/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberEmail: OWNER_EMAIL,
        ownerEmail: OWNER_EMAIL,
        templateId,
      }),
    });
  });

  describe('golden path: view plan → see macros → log food → back to nutrition', () => {
    beforeEach(async () => {
      await loginAs(OWNER_EMAIL, OWNER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('sees screen-MyNutrition with macro-summary and day-type label', async () => {
      await detoxExpect(element(by.id('screen-MyNutrition'))).toBeVisible();
      await waitFor(element(by.id('macro-summary'))).toBeVisible().withTimeout(10000);
      await waitFor(
        element(by.id(`nutrition-day-type-${SEEDED_DAY_TYPE}`)),
      ).toBeVisible().withTimeout(10000);
    });

    it('sees at least one meal-card and can log a food item', async () => {
      // Wait for meal cards to load
      await waitFor(element(by.id('meal-card-1'))).toBeVisible().withTimeout(10000);

      // Tap the log food button on the first meal card
      await element(by.id('log-food-button')).atIndex(0).tap();

      // LogFood screen should appear
      await waitFor(element(by.id('screen-LogFood'))).toBeVisible().withTimeout(10000);

      // Seeded food result should be visible
      await waitFor(element(by.id(`food-result-${SEEDED_FOOD_NAME}`))).toBeVisible().withTimeout(10000);

      // Select the food
      await element(by.id(`food-result-${SEEDED_FOOD_NAME}`)).tap();

      // Quantity input should appear; replace default with 150g
      await waitFor(element(by.id('quantity-input'))).toBeVisible().withTimeout(5000);
      await element(by.id('quantity-input')).clearText();
      await element(by.id('quantity-input')).typeText('150');

      // Confirm the log
      await element(by.id('confirm-log-food')).tap();

      // Should navigate back to My Nutrition
      await waitFor(element(by.id('screen-MyNutrition'))).toBeVisible().withTimeout(10000);

      // macro-summary should still be visible after logging
      await waitFor(element(by.id('macro-summary'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('edge case: owner with no plan assigned shows empty state', () => {
    const EMPTY_OWNER_EMAIL = `owner-noplan-nutrition-${TS}@powergym.com`;
    const EMPTY_OWNER_PASSWORD = 'OwnerPass123!';

    beforeAll(async () => {
      // Seed a second owner without assigning any nutrition plan
      await fetch(`${API_URL}/auth/dev/seed-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: EMPTY_OWNER_EMAIL,
          password: EMPTY_OWNER_PASSWORD,
          role: 'owner',
        }),
      });
    });

    beforeEach(async () => {
      await loginAs(EMPTY_OWNER_EMAIL, EMPTY_OWNER_PASSWORD);
      await navigateToMyNutrition();
    });

    it('shows my-nutrition-empty and no meal-card when no plan assigned', async () => {
      await detoxExpect(element(by.id('screen-MyNutrition'))).toBeVisible();
      await waitFor(element(by.id('my-nutrition-empty'))).toBeVisible().withTimeout(10000);
      await detoxExpect(element(by.id('meal-card-1'))).not.toBeVisible();
    });
  });
});
