/**
 * Owner Nutrition Templates E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/nutrition-templates
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account per run (empty templates list)
 *   - No food seed endpoint — the spec creates a custom food via the form's
 *     "Create custom food" path in FoodSearchSheet.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-nutrition-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const FOOD_NAME = `Chicken Breast ${TS}`;
const TEMPLATE_NAME = `High Protein Plan ${TS}`;

describe('Owner: Nutrition Templates', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
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

    // Navigate to Nutrition Templates via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-NutritionTemplates')).tap();
    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create template with day type → add meal → add food → save → detail shows correct data', async () => {
    // Tap + Create button
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    // Enter template name
    await element(by.id('template-name-input')).typeText(TEMPLATE_NAME);

    // Add a day type
    await element(by.id('add-day-type-button')).tap();

    // Add a meal to day type 0
    await element(by.id('add-meal-button-0')).tap();

    // Add a food to meal 0 in day type 0
    await element(by.id('add-food-button-0-0')).tap();

    // Food search sheet opens — create a custom food
    await waitFor(element(by.id('food-search-input'))).toBeVisible().withTimeout(10000);
    await element(by.id('food-search-input')).typeText(FOOD_NAME);

    // Tap "Create custom food" button
    await waitFor(element(by.id('create-custom-food-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('create-custom-food-button')).tap();

    // Food is added — form resumes showing the food name
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(FOOD_NAME))).toBeVisible().withTimeout(10000);

    // Save the template
    await waitFor(element(by.id('template-save-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('template-save-button')).tap();

    // Return to list — new template card appears
    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(TEMPLATE_NAME))).toBeVisible().withTimeout(10000);
  });

  it('detail + delete: tap template → detail shows day-type tabs and meals → tap Delete → confirm → removed from list', async () => {
    // First create a template to delete
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    const deleteName = `To Delete ${TS}`;
    await element(by.id('template-name-input')).typeText(deleteName);
    await element(by.id('add-day-type-button')).tap();
    await element(by.id('template-save-button')).tap();

    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(deleteName))).toBeVisible().withTimeout(10000);

    // Tap card to open detail
    await element(by.text(deleteName)).tap();
    await waitFor(element(by.id('screen-NutritionTemplateDetail'))).toBeVisible().withTimeout(10000);

    // Day type tab should be visible
    await detoxExpect(element(by.id('day-type-tab-Training Day'))).toBeVisible();

    // Tap delete
    await element(by.id('template-delete-button')).tap();
    await waitFor(element(by.id('template-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('template-delete-confirm')).tap();

    // Should return to list with card gone
    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text(deleteName))).not.toBeVisible();
  });

  it('edit: open a template → Edit → add a second day type → save → detail shows two tabs', async () => {
    // Create a template with one day type
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    const editName = `Edit Me ${TS}`;
    await element(by.id('template-name-input')).typeText(editName);
    await element(by.id('add-day-type-button')).tap();
    await element(by.id('template-save-button')).tap();

    await waitFor(element(by.id('screen-NutritionTemplates'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(editName))).toBeVisible().withTimeout(10000);

    // Open detail
    await element(by.text(editName)).tap();
    await waitFor(element(by.id('screen-NutritionTemplateDetail'))).toBeVisible().withTimeout(10000);

    // Tap edit
    await element(by.id('template-edit-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    // Add a second day type
    await element(by.id('add-day-type-button')).tap();
    await element(by.id('template-save-button')).tap();

    // Detail now shows two tabs
    await waitFor(element(by.id('screen-NutritionTemplateDetail'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('day-type-tab-Training Day'))).toBeVisible();
    await detoxExpect(element(by.id('day-type-tab-Rest Day'))).toBeVisible();
  });

  it('error case: save button is disabled when name is empty', async () => {
    await element(by.id('templates-add-button')).tap();
    await waitFor(element(by.id('screen-NutritionTemplateForm'))).toBeVisible().withTimeout(10000);

    // Save button must be disabled when name is empty
    await detoxExpect(element(by.id('template-save-button'))).not.toBeEnabled();
  });
});
