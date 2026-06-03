/**
 * Member My Health E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=member/my-health
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * A fresh member email is seeded per run so data does not carry over between runs.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const MEMBER_EMAIL = `member-myhealth-${Date.now()}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Member: My Health', () => {
  beforeAll(async () => {
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD, role: 'member' }),
    });
  });

  beforeEach(async () => {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    // Log in as member
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
    await element(by.id('login-email-input')).typeText(MEMBER_EMAIL);
    await element(by.id('login-password-input')).typeText(MEMBER_PASSWORD);
    await element(by.id('login-sign-in-button')).tap();

    // Navigate to My Health screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-MyHealth'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-MyHealth')).tap();
    await waitFor(element(by.id('screen-MyHealth'))).toBeVisible().withTimeout(10000);
  });

  it('golden path Injuries: report an injury, verify it appears, mark resolved, verify it moves to History', async () => {
    // Ensure we are on the Injuries tab (default)
    await waitFor(element(by.id('my-health-tab-injuries'))).toBeVisible().withTimeout(5000);

    // Tap "+ Report Injury"
    await element(by.id('injuries-report-btn')).tap();
    await waitFor(element(by.id('injury-bottom-sheet'))).toBeVisible().withTimeout(5000);

    // Fill in title
    await element(by.id('injury-title-input')).typeText('Left knee strain');

    // Tap Save
    await element(by.id('injury-save-button')).tap();

    // Sheet should close; injury appears in active list
    await waitFor(element(by.text('Left knee strain'))).toBeVisible().withTimeout(10000);

    // Tap "Mark resolved" on the new card
    await element(by.id(/^injury-resolve-btn-/)).tap();

    // Confirm dialog appears — tap Confirm
    await waitFor(element(by.id('injury-resolve-confirm-btn'))).toBeVisible().withTimeout(5000);
    await element(by.id('injury-resolve-confirm-btn')).tap();

    // Injury should no longer be in the active list
    await waitFor(element(by.text('Left knee strain'))).not.toBeVisible().withTimeout(5000);

    // Expand History section
    await waitFor(element(by.id('injuries-history-toggle'))).toBeVisible().withTimeout(5000);
    await element(by.id('injuries-history-toggle')).tap();

    // Resolved injury should now appear
    await waitFor(element(by.text('Left knee strain'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.text('Left knee strain'))).toBeVisible();
  });

  it('golden path Medications: add a medication, mark as ended, verify it appears in Ended', async () => {
    // Tap Medications tab
    await element(by.id('my-health-tab-medications')).tap();
    await waitFor(element(by.id('medications-add-btn'))).toBeVisible().withTimeout(5000);

    // Tap "+ Add Medication"
    await element(by.id('medications-add-btn')).tap();
    await waitFor(element(by.id('medication-bottom-sheet'))).toBeVisible().withTimeout(5000);

    // Fill required fields
    await element(by.id('medication-name-input')).typeText('Ibuprofen');
    await element(by.id('medication-purpose-input')).typeText('Pain relief');
    // Duration defaults to short_term — skip
    await element(by.id('medication-start-date-input')).typeText('2026-01-01');

    // Tap Save
    await element(by.id('medication-save-button')).tap();

    // Medication appears in active list
    await waitFor(element(by.text('Ibuprofen'))).toBeVisible().withTimeout(10000);

    // Tap "Mark as ended"
    await element(by.id(/^medication-end-btn-/)).tap();

    // Confirm
    await waitFor(element(by.id('medication-end-confirm-btn'))).toBeVisible().withTimeout(5000);
    await element(by.id('medication-end-confirm-btn')).tap();

    // Medication no longer visible in active list
    await waitFor(element(by.text('Ibuprofen'))).not.toBeVisible().withTimeout(5000);

    // Expand Ended section
    await waitFor(element(by.id('medications-ended-toggle'))).toBeVisible().withTimeout(5000);
    await element(by.id('medications-ended-toggle')).tap();

    // Ended medication is visible
    await waitFor(element(by.text('Ibuprofen'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.text('Ibuprofen'))).toBeVisible();
  });

  it('golden path Background: fill emergency contact, save, navigate away and back — value persists', async () => {
    // Tap Background tab
    await element(by.id('my-health-tab-background')).tap();
    await waitFor(element(by.id('background-emergency-contact-input'))).toBeVisible().withTimeout(5000);

    // Fill in allergies field
    await element(by.id('background-allergies-input')).clearText();
    await element(by.id('background-allergies-input')).typeText('Penicillin');

    // Tap Save (should be enabled now)
    await waitFor(element(by.id('background-save-btn'))).toBeVisible().withTimeout(5000);
    await element(by.id('background-save-btn')).tap();

    // Navigate away via drawer
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-MyHealth'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-MyHealth')).tap();

    // Go back to Background tab
    await waitFor(element(by.id('screen-MyHealth'))).toBeVisible().withTimeout(10000);
    await element(by.id('my-health-tab-background')).tap();
    await waitFor(element(by.id('background-allergies-input'))).toBeVisible().withTimeout(5000);

    // Saved value should still be there
    await detoxExpect(element(by.id('background-allergies-input'))).toHaveText('Penicillin');
  });

  it('error case: submit injury form without title — inline validation error shown, form stays open', async () => {
    // On Injuries tab by default
    await waitFor(element(by.id('injuries-report-btn'))).toBeVisible().withTimeout(5000);

    // Tap "+ Report Injury"
    await element(by.id('injuries-report-btn')).tap();
    await waitFor(element(by.id('injury-bottom-sheet'))).toBeVisible().withTimeout(5000);

    // Tap Save without filling title
    await element(by.id('injury-save-button')).tap();

    // Error message should be visible
    await waitFor(element(by.id('injury-title-error'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('injury-title-error'))).toBeVisible();

    // Form (sheet) should still be open
    await detoxExpect(element(by.id('injury-save-button'))).toBeVisible();
  });
});
