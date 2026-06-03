/**
 * Trainer Invites E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/invites
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * A fresh trainer email is seeded per run so the invite list is empty at start.
 */

import { device, element, by, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-invites-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Invites management', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD, role: 'trainer' }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as trainer
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to Invites screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Invites'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Invites')).tap();
    await waitFor(element(by.id('invites-create-button'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: create member invite (role fixed to member, no trainer picker) → card appears', async () => {
    const recipientEmail = `member-invite-${Date.now()}@example.com`;

    await element(by.id('invites-create-button')).tap();
    await waitFor(element(by.id('invite-email-input'))).toBeVisible().withTimeout(5000);

    // Trainer sees only member role — no trainer-role picker
    await waitFor(element(by.id('invite-role-member'))).toBeVisible().withTimeout(3000);

    // No trainer role option visible
    try {
      await waitFor(element(by.id('invite-role-trainer'))).toBeVisible().withTimeout(1000);
      throw new Error('invite-role-trainer should not be visible for trainer');
    } catch {
      // Expected — not visible
    }

    // No trainer picker visible
    try {
      await waitFor(element(by.id('invite-trainer-picker'))).toBeVisible().withTimeout(1000);
      throw new Error('invite-trainer-picker should not be visible for trainer');
    } catch {
      // Expected — not visible
    }

    // Enter email
    await element(by.id('invite-email-input')).typeText(recipientEmail);

    // Save
    await element(by.id('invite-save-button')).tap();

    // New invite card should appear
    await waitFor(element(by.id(/^invite-card-/))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(recipientEmail))).toBeVisible().withTimeout(5000);
  });
});
