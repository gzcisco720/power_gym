/**
 * Trainer Services Role-Gating E2E — Detox on iOS Simulator
 *
 * Services is an owner-only screen. This spec verifies that the Services
 * drawer item is not visible to trainers.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with seeded data:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/services
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = 'trainer-services@powergym.com';
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Services access control', () => {
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

    // Open the drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-user-footer'))).toBeVisible().withTimeout(10000);
  });

  it('Services drawer item is not visible to trainers (owner-only nav)', async () => {
    await detoxExpect(element(by.id('drawer-item-Services'))).not.toBeVisible();
  });

  it('trainer drawer shows trainer-specific items: Members, Calendar, Billing', async () => {
    await detoxExpect(element(by.id('drawer-item-Members'))).toBeVisible();
    await detoxExpect(element(by.id('drawer-item-Calendar'))).toBeVisible();
    await detoxExpect(element(by.id('drawer-item-Billing'))).toBeVisible();
  });
});
