/**
 * Owner Dashboard Navigation E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *    Seed an owner: POST /auth/dev/seed-user with { email, password, role: 'owner' }
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
    await fetch(`${API_URL}/auth/dev/seed-user`, {
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

    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(10000);
  });
});
