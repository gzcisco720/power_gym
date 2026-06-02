/**
 * Owner Services E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with seeded data:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=services
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = 'owner-services@powergym.com';
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Services management', () => {
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

    // Navigate to Services screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Services'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Services')).tap();
    await waitFor(element(by.id('services-add-button'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: add → edit name → deactivate → verify in Inactive tab', async () => {
    const serviceName = `PT Session ${Date.now()}`;
    const editedName = `${serviceName} Edited`;

    // ── Add a new service ─────────────────────────────────────────────────────
    await element(by.id('services-add-button')).tap();
    await waitFor(element(by.id('service-name-input'))).toBeVisible().withTimeout(5000);

    await element(by.id('service-name-input')).typeText(serviceName);
    await element(by.id('service-duration-input')).typeText('60');
    await element(by.id('service-price-input')).typeText('80');
    await element(by.id('service-save-button')).tap();

    // New service card should appear in the list
    await waitFor(element(by.text(serviceName))).toBeVisible().withTimeout(10000);

    // ── Tap the card to open Edit sheet ───────────────────────────────────────
    await element(by.text(serviceName)).tap();
    await waitFor(element(by.id('service-name-input'))).toBeVisible().withTimeout(5000);

    // Edit sheet is pre-filled — clear and retype the name
    await element(by.id('service-name-input')).clearText();
    await element(by.id('service-name-input')).typeText(editedName);
    await element(by.id('service-save-button')).tap();

    // Success feedback visible after saving
    await waitFor(element(by.text('Changes saved'))).toBeVisible().withTimeout(5000);

    // ── Tap the card again → toggle active off → save → Inactive tab ─────────
    await element(by.text(editedName)).tap();
    await waitFor(element(by.id('service-active-toggle'))).toBeVisible().withTimeout(5000);
    await element(by.id('service-active-toggle')).tap();
    await element(by.id('service-save-button')).tap();

    await waitFor(element(by.text('Changes saved'))).toBeVisible().withTimeout(5000);

    // ── Switch to Inactive filter tab → card appears there ───────────────────
    await element(by.id('services-filter-inactive')).tap();
    await waitFor(element(by.text(editedName))).toBeVisible().withTimeout(5000);
  });

  it('error case: leaving name empty keeps save button disabled', async () => {
    await element(by.id('services-add-button')).tap();
    await waitFor(element(by.id('service-name-input'))).toBeVisible().withTimeout(5000);

    // Save button should be disabled when name is empty (only duration and price filled)
    await element(by.id('service-duration-input')).typeText('60');
    await element(by.id('service-price-input')).typeText('80');

    await detoxExpect(element(by.id('service-save-button'))).not.toBeEnabled();

    // Sheet stays open — no service created
    await detoxExpect(element(by.id('service-name-input'))).toBeVisible();
  });
});
