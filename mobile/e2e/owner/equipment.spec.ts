/**
 * Owner Equipment E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with seeded data:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=equipment
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = 'owner-equipment@powergym.com';
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Equipment management', () => {
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

    // Navigate to Equipment screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Equipment'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Equipment')).tap();
    await waitFor(element(by.id('equipment-add-button'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: add → tap card → edit → save → condition report → delete', async () => {
    const equipmentName = `Test Rower ${Date.now()}`;
    const editedName = `${equipmentName} Edited`;

    // ── Add a new equipment item ──────────────────────────────────────────────
    await element(by.id('equipment-add-button')).tap();
    await waitFor(element(by.id('add-name-input'))).toBeVisible().withTimeout(5000);
    await element(by.id('add-name-input')).typeText(equipmentName);
    await element(by.id('add-save-button')).tap();

    // Wait for the sheet to show success and new card to appear in the list
    await waitFor(element(by.text(equipmentName))).toBeVisible().withTimeout(10000);

    // ── Tap the card to open Detail screen ───────────────────────────────────
    await element(by.text(equipmentName)).tap();
    await waitFor(element(by.id('equipment-detail-name-input'))).toBeVisible().withTimeout(5000);

    // Details tab is active by default — verify name is pre-filled
    await detoxExpect(element(by.id('equipment-detail-name-input'))).toHaveValue(equipmentName);

    // ── Edit the name and save ────────────────────────────────────────────────
    await element(by.id('equipment-detail-name-input')).clearText();
    await element(by.id('equipment-detail-name-input')).typeText(editedName);
    await element(by.id('equipment-detail-save')).tap();

    await waitFor(element(by.text('Changes saved'))).toBeVisible().withTimeout(5000);

    // ── Open Condition Reports tab ────────────────────────────────────────────
    await element(by.id('tab-condition-reports')).tap();
    await waitFor(element(by.id('report-note-input'))).toBeVisible().withTimeout(5000);

    // Submit a condition report
    await element(by.id('report-note-input')).typeText('Belt is worn');
    await element(by.id('report-submit')).tap();

    await waitFor(element(by.id('report-item-0'))).toBeVisible().withTimeout(5000);

    // ── Delete the equipment item ─────────────────────────────────────────────
    await element(by.id('tab-details')).tap();
    await waitFor(element(by.id('equipment-detail-delete'))).toBeVisible().withTimeout(5000);
    await element(by.id('equipment-detail-delete')).tap();

    await waitFor(element(by.id('equipment-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('equipment-delete-confirm')).tap();

    // After delete, navigation should go back to the Equipment list
    await waitFor(element(by.id('equipment-add-button'))).toBeVisible().withTimeout(10000);

    // The deleted item should no longer be visible
    await detoxExpect(element(by.text(editedName))).not.toBeVisible();
  });

  it('error case: leaving name empty keeps add-save-button disabled (no item created)', async () => {
    await element(by.id('equipment-add-button')).tap();
    await waitFor(element(by.id('add-name-input'))).toBeVisible().withTimeout(5000);

    // Save button should be disabled when name is empty
    await detoxExpect(element(by.id('add-save-button'))).not.toBeEnabled();

    // Close the sheet without creating anything
    await device.pressBack();
  });
});
