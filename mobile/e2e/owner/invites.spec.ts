/**
 * Owner Invites E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/invites
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * A fresh owner email is seeded per run so the invite list is empty at start.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = `owner-invites-${Date.now()}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Invites management', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD, role: 'owner' }),
    });

    // Seed a trainer for the member invite trainer picker test
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `trainer-for-invites-${Date.now()}@powergym.com`,
        password: 'TrainerPass123!',
        role: 'trainer',
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

    // Navigate to Invites screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Invites'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Invites')).tap();
    await waitFor(element(by.id('invites-create-button'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create trainer invite → card appears in list', async () => {
    const recipientEmail = `trainer-invite-${Date.now()}@example.com`;

    await element(by.id('invites-create-button')).tap();
    await waitFor(element(by.id('invite-role-trainer'))).toBeVisible().withTimeout(5000);

    // Select trainer role
    await element(by.id('invite-role-trainer')).tap();

    // Enter email
    await element(by.id('invite-email-input')).typeText(recipientEmail);

    // Save
    await element(by.id('invite-save-button')).tap();

    // New invite card should appear
    await waitFor(element(by.id(/^invite-card-/))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(recipientEmail))).toBeVisible().withTimeout(5000);
  });

  it('copy link and revoke: tap copy → Copied feedback, tap revoke → confirm → card gone', async () => {
    // First create a pending invite
    const recipientEmail = `revoke-invite-${Date.now()}@example.com`;

    await element(by.id('invites-create-button')).tap();
    await waitFor(element(by.id('invite-role-trainer'))).toBeVisible().withTimeout(5000);
    await element(by.id('invite-role-trainer')).tap();
    await element(by.id('invite-email-input')).typeText(recipientEmail);
    await element(by.id('invite-save-button')).tap();

    await waitFor(element(by.id(/^invite-card-/))).toBeVisible().withTimeout(10000);

    // Tap copy link — check "Copied!" feedback appears
    await element(by.id(/^invite-copy-/)).tap();
    await waitFor(element(by.text('Copied!'))).toBeVisible().withTimeout(3000);

    // Tap revoke
    await element(by.id(/^invite-revoke-/)).tap();

    // Confirm in the dialog
    await waitFor(element(by.id('invite-revoke-confirm'))).toBeVisible().withTimeout(5000);
    await element(by.id('invite-revoke-confirm')).tap();

    // Card should be gone
    await waitFor(element(by.text(recipientEmail))).not.toBeVisible().withTimeout(5000);
  });

  it('member invite gating: save stays disabled until a trainer is chosen', async () => {
    await element(by.id('invites-create-button')).tap();
    await waitFor(element(by.id('invite-role-member'))).toBeVisible().withTimeout(5000);

    // Select member role
    await element(by.id('invite-role-member')).tap();

    // Enter valid email
    await element(by.id('invite-email-input')).typeText('member@example.com');

    // Trainer picker should be visible but no trainer selected yet
    await waitFor(element(by.id('invite-trainer-picker'))).toBeVisible().withTimeout(3000);

    // Save button must be disabled
    await detoxExpect(element(by.id('invite-save-button'))).not.toBeEnabled();

    // Select a trainer — save becomes enabled
    await element(by.id(/^invite-trainer-option-/)).tap();
    await detoxExpect(element(by.id('invite-save-button'))).toBeEnabled();
  });
});
