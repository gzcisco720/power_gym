/**
 * Trainer Dashboard E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with seeded data:
 *    cd backend && pnpm start:dev
 *    Ensure the trainer account has members, sessions, and check-ins seeded.
 *
 * 3. Run this spec:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/dashboard
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = 'trainer@powergym.com';
const TRAINER_PASSWORD = 'TrainerPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer Dashboard', () => {
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

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
  });

  // ── 1. Golden Path — KPI cards, Today's Sessions, My Training ────────────

  it('shows the four KPI cards, Today\'s Sessions, and My Training after login', async () => {
    await waitFor(element(by.id('trainer-dashboard'))).toBeVisible().withTimeout(15000);

    // Four KPI stat cards
    await waitFor(element(by.id('stat-members'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('stat-sessions-today'))).toBeVisible();
    await detoxExpect(element(by.id('stat-checkins'))).toBeVisible();
    await detoxExpect(element(by.id('stat-needs-attention'))).toBeVisible();

    // Today's Sessions section header
    await waitFor(element(by.text("TODAY'S SESSIONS"))).toBeVisible().withTimeout(10000);

    // My Training section header — scroll down to find it
    await waitFor(element(by.text('MY TRAINING')))
      .toBeVisible()
      .whileElement(by.id('trainer-dashboard'))
      .scroll(300, 'down');

    // Streak number is visible (any number)
    await detoxExpect(element(by.text('day streak 🔥'))).toBeVisible();
  });

  // ── 2. Empty state — no sessions today ────────────────────────────────────

  it('shows "No sessions scheduled today" when trainer has no sessions today', async () => {
    // This test requires the backend to be seeded with a trainer who has no sessions today.
    // Seed via the dev endpoint before running.
    await fetch(`${API_URL}/auth/dev/seed-trainer-no-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL }),
    }).catch(() => {
      // Endpoint may not exist in all environments — the test will catch the missing text
    });

    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
    await waitFor(element(by.id('trainer-dashboard'))).toBeVisible().withTimeout(15000);

    await waitFor(element(by.text('No sessions scheduled today')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
