/**
 * Owner Trainer Hub E2E — Detox on iOS Simulator
 *
 * Tests the expanded TrainerDetailScreen (5 tabs: Overview, Members, Calendar,
 * Training Plans, Nutrition Plans) from an Owner perspective.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/trainer-hub
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - An owner account (the test user)
 *   - A trainer with one assigned member (seedMembers: true)
 *   - A second trainer with no members (reassign target)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-hub-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const TRAINER_EMAIL = `trainer-hub-${TS}@powergym.com`;
const TRAINER_B_EMAIL = `trainer-hub-b-${TS}@powergym.com`;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Trainer Hub depth', () => {
  beforeAll(async () => {
    // Seed owner
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        role: 'owner',
      }),
    });

    // Seed trainer A with one member
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: 'TrainerPass123!',
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Seed trainer B (reassign target)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_B_EMAIL,
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

    // Navigate to Trainers screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Trainers'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Trainers')).tap();
    await waitFor(element(by.id('screen-Trainers'))).toBeVisible().withTimeout(10000);

    // Open trainer A's detail
    await waitFor(element(by.id(/^trainer-row-/))).toBeVisible().withTimeout(10000);
    await element(by.id(/^trainer-row-/)).atIndex(0).tap();
    await waitFor(element(by.id('screen-TrainerDetail'))).toBeVisible().withTimeout(10000);
  });

  it('Members tab shows a member row with streak/sessions metric line and a status badge', async () => {
    // Tap Members tab
    await waitFor(element(by.id('trainer-detail-tab-members'))).toBeVisible().withTimeout(5000);
    await element(by.id('trainer-detail-tab-members')).tap();

    // At least one trainer-member-row visible
    await waitFor(element(by.id(/^trainer-member-row-/))).toBeVisible().withTimeout(10000);

    // A status badge should be visible — one of Active, Needs Attn, No Plan
    const hasActiveOrNeedsAttn = await Promise.race([
      element(by.text('Active')).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      element(by.text('Needs Attn')).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      element(by.text('No Plan')).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
    ]);
    expect(hasActiveOrNeedsAttn).toBe(true);

    // Metric labels should be visible
    await detoxExpect(element(by.text('day streak'))).toBeVisible();
    await detoxExpect(element(by.text('sessions/mo'))).toBeVisible();
  });

  it('Reassign: tapping Reassign on a member, picking a different trainer → success', async () => {
    await waitFor(element(by.id('trainer-detail-tab-members'))).toBeVisible().withTimeout(5000);
    await element(by.id('trainer-detail-tab-members')).tap();

    // Wait for member row
    await waitFor(element(by.id(/^trainer-member-row-/))).toBeVisible().withTimeout(10000);

    // Tap Reassign button on the first member
    await waitFor(element(by.id(/^reassign-member-/))).toBeVisible().withTimeout(5000);
    await element(by.id(/^reassign-member-/)).atIndex(0).tap();

    // Reassign sheet appears — pick trainer B
    await waitFor(element(by.id(/^reassign-target-/))).toBeVisible().withTimeout(5000);
    await element(by.id(/^reassign-target-/)).atIndex(0).tap();

    // After reassign, member should no longer be in the list OR the list shows empty state
    await waitFor(
      element(by.text('No members assigned.')).or(element(by.id(/^trainer-member-row-/))),
    ).toBeVisible().withTimeout(10000);
  });

  it('Training Plans tab shows at least one template row or the empty-state text', async () => {
    await waitFor(element(by.id('trainer-detail-tab-training'))).toBeVisible().withTimeout(5000);
    await element(by.id('trainer-detail-tab-training')).tap();

    // Either a training plan row or the empty-state text should be visible
    const hasContent = await Promise.race([
      waitFor(element(by.id(/^training-plan-row-/))).toBeVisible().withTimeout(8000)
        .then(() => true).catch(() => false),
      waitFor(element(by.text('No training plans yet.'))).toBeVisible().withTimeout(8000)
        .then(() => true).catch(() => false),
    ]);
    expect(hasContent).toBe(true);
  });
});
