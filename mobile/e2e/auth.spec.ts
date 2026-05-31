/**
 * Auth E2E Suite — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Generate native iOS project (first time only):
 *    cd mobile && npx expo prebuild --platform ios
 *
 * 2. Build the Detox app:
 *    cd mobile && pnpm detox:build
 *
 * 3. Start the backend:
 *    cd backend && pnpm start:dev
 *    Seed a test user: test@powergym.com / TestPass123!
 *
 * 4. Run the E2E tests:
 *    cd mobile && pnpm detox:test
 *
 * Note: synchronization is disabled for the entire suite because the iOS
 * "Save Password?" system dialog keeps the main dispatch queue non-idle, which
 * would cause every assertion after login to time out. All expectations use
 * explicit waitFor + withTimeout instead of relying on auto-sync.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TEST_EMAIL = 'test@powergym.com';
const TEST_PASSWORD = 'TestPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getDevResetToken(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/dev/reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const json = await res.json() as { token: string };
  return json.token;
}

describe('Auth', () => {
  beforeAll(async () => {
    // Ensure test user exists with known credentials.
    // Also resets the password if a previous run changed it (reset-password test).
    await fetch(`${API_URL}/auth/dev/seed-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, role: 'member' }),
    });
  });

  beforeEach(async () => {
    // Clear iOS Keychain (SecureStore) so biometrics_enabled from a previous
    // test doesn't cause hydrate() to call authenticateAsync() on startup,
    // which would open a Face ID dialog and hang the main queue indefinitely.
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    // Disable synchronization AFTER launch — the iOS "Save Password?" dialog
    // keeps the main dispatch queue non-idle after any password submit, which
    // would cause every synchronized waitFor to block indefinitely.
    // All assertions use explicit waitFor + withTimeout instead.
    await device.disableSynchronization();
  });

  // ── 1. Golden Path ────────────────────────────────────────────────────────

  describe('Golden path login', () => {
    it('enters valid email + password, taps Sign In, lands on HomeScreen', async () => {
      await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);

      await element(by.id('login-email-input')).typeText(TEST_EMAIL);
      await element(by.id('login-password-input')).typeText(TEST_PASSWORD);
      await element(by.id('login-sign-in-button')).tap();

      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── 2. Biometrics Enable + Relaunch ──────────────────────────────────────

  describe('Biometrics', () => {
    it('first login shows enable prompt → Enable → relaunch → Face ID resolves to HomeScreen', async () => {
      // Note: this test has two app launches so it needs extra time
      jest.setTimeout(180000);
      await device.setBiometricEnrollment(true);

      await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
      await element(by.id('login-email-input')).typeText(TEST_EMAIL);
      await element(by.id('login-password-input')).typeText(TEST_PASSWORD);
      await element(by.id('login-sign-in-button')).tap();

      // Biometrics prompt appears on HomeScreen after first login
      await waitFor(element(by.id('biometrics-enable-button'))).toBeVisible().withTimeout(15000);
      await element(by.id('biometrics-enable-button')).tap();

      // Relaunch — biometrics are now enabled.
      // hydrate() only reads the biometricsEnabled flag (no auto-auth on startup).
      // The Face ID button is shown; the user taps it to trigger authenticateAsync().
      await device.launchApp({ newInstance: true });

      await waitFor(element(by.id('login-face-id-button'))).toBeVisible().withTimeout(15000);
      await element(by.id('login-face-id-button')).tap();
      // Face ID dialog now open — simulate a successful match
      await device.matchFace();

      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── 3. Forgot Password ────────────────────────────────────────────────────

  describe('Forgot password', () => {
    it('navigates to ForgotPassword → enters email → taps Send Reset Link → sees confirmation', async () => {
      await waitFor(element(by.id('login-forgot-password-link'))).toBeVisible().withTimeout(15000);
      await element(by.id('login-forgot-password-link')).tap();

      await waitFor(element(by.id('forgot-password-email-input'))).toBeVisible().withTimeout(10000);
      await element(by.id('forgot-password-email-input')).typeText(TEST_EMAIL);
      await element(by.id('forgot-password-submit-button')).tap();

      await waitFor(element(by.id('forgot-password-success-message'))).toBeVisible().withTimeout(10000);
    });
  });

  // ── 4. Deep-link Reset Password ───────────────────────────────────────────

  describe('Deep-link reset password', () => {
    it('opens powergym://reset-password?token=<token> → ResetPasswordScreen → matching passwords → returns to Login with success', async () => {
      const resetToken = await getDevResetToken(TEST_EMAIL);

      await device.openURL({ url: `powergym://reset-password?token=${resetToken}` });

      await waitFor(element(by.id('reset-password-new-password-input'))).toBeVisible().withTimeout(15000);

      const newPassword = 'NewSecurePass456!';
      await element(by.id('reset-password-new-password-input')).typeText(newPassword);
      await element(by.id('reset-password-confirm-password-input')).typeText(newPassword);
      await element(by.id('reset-password-submit-button')).tap();

      await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(10000);
    });
  });
});
