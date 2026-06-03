/**
 * Owner Calendar E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/calendar
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - A fresh owner account per run
 *   - seedMembers: true  — so there is at least one member to assign to a session
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-calendar-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Calendar', () => {
  beforeAll(async () => {
    // Seed owner account with a member so we can assign them to a session
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
        seedMembers: true,
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

    // Navigate to Calendar via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Calendar'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Calendar')).tap();
    await waitFor(element(by.id('screen-Calendar'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create session → appears in agenda → edit name → updated card shown → delete → card gone', async () => {
    // Tap + Add button
    await element(by.id('calendar-add-button')).tap();
    await waitFor(element(by.id('screen-SessionForm'))).toBeVisible().withTimeout(10000);

    // Select the first member in the list
    await waitFor(element(by.id(/^member-option-.+/))).toBeVisible().withTimeout(5000);
    // Tap the first available member option
    await element(by.type('UIButton')).atIndex(0).tap();

    // Set date
    await element(by.id('session-form-date-input')).tap();
    await element(by.id('session-form-date-input')).clearText();
    await element(by.id('session-form-date-input')).typeText('2026-08-01');

    // Set start time
    await element(by.id('session-form-start-input')).tap();
    await element(by.id('session-form-start-input')).clearText();
    await element(by.id('session-form-start-input')).typeText('10:00');

    // Set end time
    await element(by.id('session-form-end-input')).tap();
    await element(by.id('session-form-end-input')).clearText();
    await element(by.id('session-form-end-input')).typeText('11:00');

    // Set custom service name
    await element(by.id('session-form-custom-name-input')).tap();
    await element(by.id('session-form-custom-name-input')).typeText('Test Session');

    // Save
    await waitFor(element(by.id('session-form-save-button'))).toBeVisible().withTimeout(5000);
    await element(by.id('session-form-save-button')).tap();

    // Back on CalendarScreen — session card should appear
    await waitFor(element(by.id('screen-Calendar'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text('Test Session'))).toBeVisible().withTimeout(10000);

    // Tap the session card to edit
    await element(by.text('Test Session')).tap();
    await waitFor(element(by.id('screen-SessionForm'))).toBeVisible().withTimeout(10000);

    // Update custom name
    await element(by.id('session-form-custom-name-input')).clearText();
    await element(by.id('session-form-custom-name-input')).typeText('Updated Session');

    // Save edits
    await element(by.id('session-form-save-button')).tap();

    // Updated card should show
    await waitFor(element(by.id('screen-Calendar'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text('Updated Session'))).toBeVisible().withTimeout(10000);

    // Delete the session
    await element(by.id(/^session-delete-btn-.+/)).tap();

    // Confirm delete dialog appears
    await waitFor(element(by.id('delete-confirm-dialog'))).toBeVisible().withTimeout(5000);

    // Tap confirm
    await element(by.id('delete-confirm-button')).tap();

    // Card should be gone
    await waitFor(element(by.id('screen-Calendar'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.text('Updated Session'))).not.toBeVisible();
  });

  it('error case: save disabled when date or time is missing', async () => {
    // Tap + Add button
    await element(by.id('calendar-add-button')).tap();
    await waitFor(element(by.id('screen-SessionForm'))).toBeVisible().withTimeout(10000);

    // Save button should be disabled (no members, date, or times)
    await detoxExpect(element(by.id('session-form-save-button'))).not.toBeEnabled();

    // Select a member but leave date/time empty
    await waitFor(element(by.id(/^member-option-.+/))).toBeVisible().withTimeout(5000);
    await element(by.type('UIButton')).atIndex(0).tap();

    // Save still disabled — no date or times
    await detoxExpect(element(by.id('session-form-save-button'))).not.toBeEnabled();
  });
});
