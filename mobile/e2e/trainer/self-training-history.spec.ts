/**
 * Trainer Self-Training Calendar & History E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/self-training-history
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint with seedSelfSessions=true (dev mode only)
 *
 * SEEDING STRATEGY:
 * - POST /auth/dev/seed-user-role with { role: 'trainer', seedSelfSessions: true }
 *   creates a trainer with one completed self-session logged today.
 *   The Calendar view will mark today's date with a session dot.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-self-cal-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Self-Training Calendar view', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedSelfSessions: true,
      }),
    });
  });

  async function loginAndOpenMyTraining(): Promise<void> {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-item-MyTraining')).tap();

    await waitFor(element(by.id('screen-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);
  }

  // ── E2E-1: Calendar view ────────────────────────────────────────────────────

  it('golden path: trainer switches to Calendar view — month grid renders with at least one marked day', async () => {
    await loginAndOpenMyTraining();

    // Switch to Calendar view
    await element(by.id('view-tab-Calendar')).tap();

    // The month grid must be visible
    await waitFor(element(by.id('self-workout-calendar')))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id('self-workout-calendar'))).toBeVisible();

    // At least one marked training day must be present
    await waitFor(element(by.id(/^calendar-day-marked-/)))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id(/^calendar-day-marked-/))).toBeVisible();
  });

  // ── E2E-2: Tap marked day → SelfSessionDetailScreen ────────────────────────

  it('tapping a marked day navigates to the self session detail screen showing that session\'s day name', async () => {
    await loginAndOpenMyTraining();

    // Switch to Calendar view
    await element(by.id('view-tab-Calendar')).tap();

    await waitFor(element(by.id(/^calendar-day-marked-/)))
      .toBeVisible()
      .withTimeout(8000);

    // Tap the marked day
    await element(by.id(/^calendar-day-marked-/)).tap();

    // SelfSessionDetailScreen should open
    await waitFor(element(by.id('screen-SelfSessionDetail')))
      .toBeVisible()
      .withTimeout(8000);

    // The day name from the seeded session should be visible
    await detoxExpect(element(by.id('screen-SelfSessionDetail'))).toBeVisible();
  });
});

describe('Trainer: Self-Training History view', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedSelfSessions: true,
      }),
    });
  });

  async function loginAndOpenHistory(): Promise<void> {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-item-MyTraining')).tap();

    await waitFor(element(by.id('screen-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);

    // Switch to History view
    await element(by.id('view-tab-History')).tap();
  }

  // ── E2E-3: History list ─────────────────────────────────────────────────────

  it('trainer opens My Training, switches to History — a list of past sessions renders with at least one row', async () => {
    await loginAndOpenHistory();

    // At least one history row must be present
    await waitFor(element(by.id(/^history-row-/)))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id(/^history-row-/))).toBeVisible();
  });

  // ── E2E-4: Tap session row → SelfSessionDetailScreen ───────────────────────

  it('trainer taps a session row — the detail screen opens showing the day name, at least one exercise, and its logged set values', async () => {
    await loginAndOpenHistory();

    await waitFor(element(by.id(/^history-row-/)))
      .toBeVisible()
      .withTimeout(8000);

    // Tap the first history row
    await element(by.id(/^history-row-/)).tap();

    // SelfSessionDetailScreen should open
    await waitFor(element(by.id('screen-SelfSessionDetail')))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id('screen-SelfSessionDetail'))).toBeVisible();

    // At least one exercise group must be visible
    await waitFor(element(by.id(/^exercise-group-/)))
      .toBeVisible()
      .withTimeout(5000);
    await detoxExpect(element(by.id(/^exercise-group-/))).toBeVisible();

    // At least one set row must be visible
    await waitFor(element(by.id(/^set-row-/)))
      .toBeVisible()
      .withTimeout(5000);
    await detoxExpect(element(by.id(/^set-row-/))).toBeVisible();
  });

  // ── E2E-5: Empty state ──────────────────────────────────────────────────────

  it('trainer opens History for an account with no completed self-sessions — the "No sessions yet" empty state is shown', async () => {
    // Seed a trainer with NO self-sessions
    const emptyTrainerEmail = `trainer-no-sess-${Date.now()}@powergym.com`;
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emptyTrainerEmail,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedSelfSessions: false,
      }),
    });

    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('login-email-input')).typeText(emptyTrainerEmail);
    await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-item-MyTraining')).tap();

    await waitFor(element(by.id('screen-MyTraining')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('view-tab-History')).tap();

    // Empty state must be shown
    await waitFor(element(by.id('history-empty')))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id('history-empty'))).toBeVisible();
  });
});
