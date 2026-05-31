/**
 * Owner Settings E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=settings
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = 'settings-owner@powergym.com';
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Settings screen', () => {
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

    // Log in
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Wait for authenticated state and open drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    // Navigate to Settings via the user footer
    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(5000);
    await element(by.id('drawer-user-footer')).tap();

    // Wait for Settings screen
    await waitFor(element(by.id('settings-back'))).toBeVisible().withTimeout(5000);
  });

  it('Profile tab → change First Name → tap Save Profile → settings-save-success is visible', async () => {
    // Profile tab should be active by default
    await waitFor(element(by.id('settings-tab-profile'))).toBeVisible().withTimeout(5000);

    // Wait for profile to load (form should be populated)
    await waitFor(element(by.text('Save Profile'))).toBeVisible().withTimeout(10000);

    // Clear first name and type a new value
    const firstNameInput = element(by.text('First name').withAncestor(by.type('RCTScrollView')));
    await firstNameInput.clearText();
    await firstNameInput.typeText('UpdatedName');

    // Tap Save Profile
    await element(by.text('Save Profile')).tap();

    // Success message should appear
    await waitFor(element(by.id('settings-save-success'))).toBeVisible().withTimeout(10000);
  });

  it('renders 3 tabs — Profile, Security, Gym Info — for owner role', async () => {
    await detoxExpect(element(by.id('settings-tab-profile'))).toBeVisible();
    await detoxExpect(element(by.id('settings-tab-security'))).toBeVisible();
    await detoxExpect(element(by.id('settings-tab-gym'))).toBeVisible();
  });

  it('Security tab → wrong current password → submit → error message is visible', async () => {
    // Switch to Security tab
    await element(by.id('settings-tab-security')).tap();

    // Fill in wrong current password and valid new password
    await element(by.text('••••••••').and(by.type('RCTSinglelineTextInputView'))).atIndex(0).typeText('WrongPass123!');
    await element(by.text('••••••••').and(by.type('RCTSinglelineTextInputView'))).atIndex(1).typeText('NewGoodPass1');
    await element(by.text('••••••••').and(by.type('RCTSinglelineTextInputView'))).atIndex(2).typeText('NewGoodPass1');

    await element(by.text('Update Password')).tap();

    await waitFor(element(by.id('security-server-error'))).toBeVisible().withTimeout(10000);
  });
});
