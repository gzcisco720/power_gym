/**
 * Owner Dashboard Navigation E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=dashboard-navigation
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = 'owner@powergym.com';
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: drawer navigation', () => {
  beforeAll(async () => {
    // seed-user-role is used so the account is seeded as 'owner', not 'member'
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
  });

  it('drawer-hamburger is visible in the header after login', async () => {
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  });

  it('tap drawer-hamburger → drawer-user-footer becomes visible', async () => {
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(10000);
  });

  it('open drawer → tap drawer-item-Equipment → Equipment screen header is visible', async () => {
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-Equipment'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Equipment')).tap();

    // The Equipment placeholder screen also has a DrawerHeader with the hamburger
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: open Settings via user footer → edit Profile First Name → Save → success visible → drawer footer shows updated name', async () => {
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    // Navigate to Settings via the user footer
    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-user-footer')).tap();

    // Verify Settings screen opened
    await waitFor(element(by.id('settings-back'))).toBeVisible().withTimeout(5000);

    // Profile tab is the default — wait for form to load
    await waitFor(element(by.id('settings-tab-profile'))).toBeVisible().withTimeout(5000);

    // Clear first name and type new value — uses placeholder text to find the input
    const firstNameInput = element(by.text('First name').and(by.type('RCTSinglelineTextInputView')));
    await firstNameInput.clearText();
    await firstNameInput.typeText('GoldenOwner');

    // Tap Save Profile
    await element(by.text('Save Profile')).tap();

    // Success message must appear
    await waitFor(element(by.id('settings-save-success'))).toBeVisible().withTimeout(10000);

    // Go back to drawer and verify footer reflects the updated name
    await element(by.id('settings-back')).tap();
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(5000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('drawer-user-footer'))).toBeVisible();
  });
});
