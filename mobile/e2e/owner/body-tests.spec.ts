/**
 * Owner Body Tests E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/body-tests
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * A fresh owner email is seeded per run so the test list is empty at start.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = `owner-bodytests-${Date.now()}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Body Tests management', () => {
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

    // Navigate to My Body Tests screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-MyBodyTests'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-MyBodyTests')).tap();
    await waitFor(element(by.id('screen-MyBodyTests'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: add → live preview calculates → save → card appears → tap → detail → delete → card gone', async () => {
    // Tap "+" to open Add Body Test screen
    await element(by.id('bodytests-add-button')).tap();
    await waitFor(element(by.id('screen-AddBodyTest'))).toBeVisible().withTimeout(10000);

    // Fill basic info
    await element(by.id('body-test-age-input')).typeText('32');
    await element(by.id('sex-male')).tap();
    await element(by.id('body-test-weight-input')).typeText('78');

    // Protocol 3-Site is selected by default — confirm it and fill measurements
    await element(by.id('protocol-3site')).tap();

    await element(by.id('measurement-chest')).typeText('12');
    await element(by.id('measurement-abdominal')).typeText('18');
    await element(by.id('measurement-thigh')).typeText('14');

    // Live preview should show a calculated percentage (not "—")
    await waitFor(element(by.id('bodytest-preview-bodyfat'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('bodytest-preview-bodyfat'))).not.toHaveText('—');

    // Save the body test
    await element(by.id('bodytest-save-button')).tap();

    // Should navigate back to My Body Tests with a card visible
    await waitFor(element(by.id('screen-MyBodyTests'))).toBeVisible().withTimeout(10000);

    // At least one body-test-card should be present — match by prefix
    await waitFor(element(by.id(/^body-test-card-/))).toBeVisible().withTimeout(10000);

    // Tap the card to open detail screen
    await element(by.id(/^body-test-card-/)).tap();
    await waitFor(element(by.id('screen-BodyTestDetail'))).toBeVisible().withTimeout(10000);

    // Tap delete button to open confirmation dialog
    await waitFor(element(by.id('bodytest-delete-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('bodytest-delete-button')).tap();

    // Confirm deletion
    await waitFor(element(by.id('bodytest-delete-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('bodytest-delete-confirm')).tap();

    // Should navigate back to My Body Tests with the card gone
    await waitFor(element(by.id('screen-MyBodyTests'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id(/^body-test-card-/))).not.toBeVisible();
  });

  it('error case: save button is disabled when required fields are empty', async () => {
    await element(by.id('bodytests-add-button')).tap();
    await waitFor(element(by.id('screen-AddBodyTest'))).toBeVisible().withTimeout(10000);

    // Save button must be disabled when no fields are filled
    await detoxExpect(element(by.id('bodytest-save-button'))).not.toBeEnabled();

    // Navigate back without creating anything
    await device.pressBack();
  });
});
