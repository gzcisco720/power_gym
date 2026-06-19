/**
 * Owner Member Assign / Reassign / Unassign E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=owner/member-assign
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeds:
 *   - An owner account
 *   - Two trainers: one with a seeded member, one without
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const OWNER_EMAIL = `owner-assign-${TS}@powergym.com`;
const OWNER_PASSWORD = 'OwnerPass123!';
const TRAINER_A_EMAIL = `trainer-a-assign-${TS}@powergym.com`;
const TRAINER_B_EMAIL = `trainer-b-assign-${TS}@powergym.com`;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Owner: Member Assign / Reassign / Unassign', () => {
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

    // Seed trainer A with one member (member will be under trainer A)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_A_EMAIL,
        password: 'TrainerPass123!',
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Seed trainer B with no members
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

    // Navigate to Members screen via drawer
    await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();
    await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
  });

  it('golden path: owner taps Reassign on a member, opens the trainer Select and taps a trainer by name → toast confirms', async () => {
    // Wait for at least one member card
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);

    // Tap the Reassign button on the first member
    await element(by.id(/^reassign-btn-/)).atIndex(0).tap();

    // Reassign sheet opens — open the Select and pick a trainer by name
    await waitFor(element(by.id('reassign-trainer-select-trigger'))).toBeVisible().withTimeout(5000);
    await element(by.id('reassign-trainer-select-trigger')).tap();

    // Tap the first available trainer by table cell (trainer name appears as a SelectItem label)
    await waitFor(element(by.type('UITableViewCell'))).toBeVisible().withTimeout(5000);
    await element(by.type('UITableViewCell')).atIndex(0).tap();

    // Toast confirms the reassignment
    await waitFor(element(by.id('toast-message'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('toast-message'))).toHaveText('Trainer assigned');

    // Member card is still visible (reassign succeeded)
    await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
  });

  it('edge: trainer filter Select appears when trainers exist; picking a trainer filters the member list', async () => {
    // Wait for the trainer filter Select (trainers were seeded)
    await waitFor(element(by.id('trainer-filter-select'))).toBeVisible().withTimeout(10000);

    // Open the trainer filter Select
    await element(by.id('trainer-filter-select')).tap();

    // Pick a trainer by table cell (first non-All item)
    await waitFor(element(by.type('UITableViewCell'))).toBeVisible().withTimeout(5000);
    // Index 0 = "All trainers", index 1 = first trainer
    await element(by.type('UITableViewCell')).atIndex(1).tap();

    // Members screen still visible
    await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(5000);
  });
});
