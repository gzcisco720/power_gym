/**
 * Auth E2E Suite — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Generate native iOS project (first time only):
 *    cd mobile && npx expo prebuild --platform ios
 *
 * 2. Build the Detox app:
 *    cd mobile && pnpm detox:build
 *    (Note: xcbeautify must be installed: brew install xcbeautify)
 *
 * 3. Start the backend:
 *    cd backend && pnpm start:dev
 *    Seed a test user: test@powergym.com / TestPass123!
 *
 * 4. Run the E2E tests:
 *    cd mobile && pnpm detox:test
 *
 * Biometrics tests use Detox simulator APIs:
 *   device.setBiometricEnrollment(true)   — enroll a biometric identity
 *   device.matchFace()                     — simulate a successful Face ID match
 *   device.unmatchFace()                   — simulate a Face ID failure
 */

import { device, element, by, expect as detoxExpect } from 'detox';

const TEST_EMAIL = 'test@powergym.com';
const TEST_PASSWORD = 'TestPass123!';

describe('Auth', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  // ── 1. Golden Path ────────────────────────────────────────────────────────

  describe('Golden path login', () => {
    it('enters valid email + password, taps Sign In, lands on HomeScreen', async () => {
      await detoxExpect(element(by.id('login-email-input'))).toBeVisible();

      await element(by.id('login-email-input')).typeText(TEST_EMAIL);
      await element(by.id('login-password-input')).typeText(TEST_PASSWORD);
      await element(by.id('login-sign-in-button')).tap();

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });
  });

  // ── 2. Biometrics Enable + Relaunch ──────────────────────────────────────

  describe('Biometrics', () => {
    it('first login shows enable prompt → Enable → relaunch → Face ID resolves to HomeScreen', async () => {
      // Enroll biometrics on the simulator
      await device.setBiometricEnrollment(true);

      // Sign in with password
      await element(by.id('login-email-input')).typeText(TEST_EMAIL);
      await element(by.id('login-password-input')).typeText(TEST_PASSWORD);
      await element(by.id('login-sign-in-button')).tap();

      // The biometrics enable prompt appears after first successful login
      await detoxExpect(element(by.id('biometrics-enable-button'))).toBeVisible();
      await element(by.id('biometrics-enable-button')).tap();

      // Relaunch the app — biometrics are now enabled
      await device.launchApp({ newInstance: true });

      // Face ID button should be visible because biometricsEnabled=true
      await detoxExpect(element(by.id('login-face-id-button'))).toBeVisible();
      await element(by.id('login-face-id-button')).tap();

      // Simulator grants Face ID match
      await device.matchFace();

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });
  });

  // ── 3. Forgot Password ────────────────────────────────────────────────────

  describe('Forgot password', () => {
    it('navigates to ForgotPassword → enters email → taps Send Reset Link → sees confirmation', async () => {
      await element(by.id('login-forgot-password-link')).tap();

      await detoxExpect(element(by.id('forgot-password-email-input'))).toBeVisible();
      await element(by.id('forgot-password-email-input')).typeText(TEST_EMAIL);
      await element(by.id('forgot-password-submit-button')).tap();

      await detoxExpect(element(by.id('forgot-password-success-message'))).toBeVisible();
    });
  });

  // ── 4. Deep-link Reset Password ───────────────────────────────────────────

  describe('Deep-link reset password', () => {
    it('opens powergym://reset-password?token=<token> → ResetPasswordScreen → matching passwords → returns to Login with success', async () => {
      const resetToken = 'test-reset-token-123';

      // Open the deep link
      await device.openURL({ url: `powergym://reset-password?token=${resetToken}` });

      // ResetPasswordScreen should be shown
      await detoxExpect(element(by.id('reset-password-new-password-input'))).toBeVisible();

      const newPassword = 'NewSecurePass456!';
      await element(by.id('reset-password-new-password-input')).typeText(newPassword);
      await element(by.id('reset-password-confirm-password-input')).typeText(newPassword);
      await element(by.id('reset-password-submit-button')).tap();

      // After successful reset, navigates back to LoginScreen
      await detoxExpect(element(by.id('login-email-input'))).toBeVisible();
    });
  });
});
