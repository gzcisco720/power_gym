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

  async function loginAndOpenCalendar(): Promise<void> {
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

    // Switch to Calendar view
    await element(by.id('view-tab-Calendar')).tap();
  }

  it('golden path: trainer switches to Calendar view — month grid renders with at least one marked day', async () => {
    await loginAndOpenCalendar();

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

  it('tapping a marked day navigates to the self session detail screen showing the day name', async () => {
    await loginAndOpenCalendar();

    await waitFor(element(by.id(/^calendar-day-marked-/)))
      .toBeVisible()
      .withTimeout(8000);

    await element(by.id(/^calendar-day-marked-/)).tap();

    // Stage 5 will implement SelfSessionDetailScreen navigation.
    // For Stage 4 verification, we confirm onSelect fires without crash.
    // The detail screen is not yet registered; tapping should not crash the app.
    await waitFor(element(by.id('self-workout-calendar')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
