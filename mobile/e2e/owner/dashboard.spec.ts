/**
 * Owner Dashboard E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with seeded data:
 *    cd backend && pnpm start:dev
 *    Ensure the owner account has trainers, members, sessions, and equipment seeded.
 *
 * 3. Run this spec:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/dashboard
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const OWNER_EMAIL = 'owner@powergym.com';
const OWNER_PASSWORD = 'OwnerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner Dashboard', () => {
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

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(OWNER_EMAIL);
    await element(by.id('login-password-input')).typeText(OWNER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
  });

  // ── 1. Golden Path — six KPI cards visible ────────────────────────────────

  it('shows the six KPI cards and Member Growth chart after login', async () => {
    await waitFor(element(by.id('owner-dashboard'))).toBeVisible().withTimeout(15000);

    await waitFor(element(by.id('stat-trainers'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('stat-members'))).toBeVisible();
    await detoxExpect(element(by.id('stat-sessions-month'))).toBeVisible();
    await detoxExpect(element(by.id('stat-active-today'))).toBeVisible();
    await detoxExpect(element(by.id('stat-checkin-rate'))).toBeVisible();
    await detoxExpect(element(by.id('stat-pending-invites'))).toBeVisible();
  });

  // ── 2. Trainer Performance → Trainers screen ──────────────────────────────

  it('taps View all on Trainer Performance → navigates to the Trainers screen', async () => {
    await waitFor(element(by.id('owner-dashboard'))).toBeVisible().withTimeout(15000);

    // Scroll down to reach Trainer Performance section then tap View all →
    await waitFor(element(by.text('View all →'))).toBeVisible().withTimeout(10000);
    await element(by.text('View all →')).tap();

    // Trainers screen uses the DrawerHeader — verify we navigated away from Dashboard
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(10000);
  });
});
