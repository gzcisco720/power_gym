/**
 * Trainer Member Photos E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-photos
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * SEEDING STRATEGY:
 * - POST /auth/dev/seed-user-role with { role: 'trainer', seedMembers: true, seedPhotos: true }
 *   creates a trainer + one member whose seeded check-in includes one placeholder photo URL.
 *   This populates the Photos tab grid with at least one image item.
 *
 * - POST /auth/dev/seed-user-role with { role: 'trainer', seedMembers: true, seedPhotos: false }
 *   creates a trainer + one member whose seeded check-in has an empty photos array.
 *   This exercises the "No photos yet." empty state.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TRAINER_EMAIL = `trainer-photos-${Date.now()}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

const TRAINER_EDGE_EMAIL = `trainer-photos-edge-${Date.now()}@powergym.com`;
const TRAINER_EDGE_PASSWORD = 'TrainerPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

describe('Trainer: Member Photos tab', () => {
  beforeAll(async () => {
    // Seed main trainer whose member's check-in has a photo
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
        seedPhotos: true,
      }),
    });

    // Seed edge-case trainer whose member's check-in has NO photos
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EDGE_EMAIL,
        password: TRAINER_EDGE_PASSWORD,
        role: 'trainer',
        seedMembers: true,
        seedPhotos: false,
      }),
    });
  });

  async function loginAndOpenPhotosTab(email: string, password: string): Promise<void> {
    await device.clearKeychain();
    await device.setBiometricEnrollment(false);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();

    await waitFor(element(by.id('login-email-input')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('login-email-input')).typeText(email);
    await element(by.id('login-password-input')).typeText(password);
    await element(by.id('login-sign-in-button')).tap();

    await waitFor(element(by.id('drawer-hamburger')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('drawer-hamburger')).tap();

    await waitFor(element(by.id('drawer-item-Members')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-item-Members')).tap();

    await waitFor(element(by.id('screen-Members')))
      .toBeVisible()
      .withTimeout(10000);

    await waitFor(element(by.id(/^member-card-/)))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id(/^member-card-/)).tap();

    await waitFor(element(by.id('screen-MemberDetail')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('member-detail-tab-photos')).tap();
  }

  it('golden path: trainer opens Photos tab → photo grid renders with at least one photo', async () => {
    await loginAndOpenPhotosTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // At least one photo item must be visible
    await waitFor(element(by.id(/^photo-item-/)))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id(/^photo-item-/))).toBeVisible();
  });

  it('tapping a photo opens a modal showing check-in date and weight; tapping close dismisses it', async () => {
    await loginAndOpenPhotosTab(TRAINER_EMAIL, TRAINER_PASSWORD);

    // Wait for the photo grid to load
    await waitFor(element(by.id(/^photo-item-/)))
      .toBeVisible()
      .withTimeout(8000);

    // Tap the first photo
    await element(by.id(/^photo-item-/)).tap();

    // Modal must appear with weight info
    await waitFor(element(by.id('photo-modal')))
      .toBeVisible()
      .withTimeout(5000);
    await detoxExpect(element(by.id('photo-modal'))).toBeVisible();
    await detoxExpect(element(by.id('photo-modal-weight'))).toBeVisible();

    // Tap close
    await element(by.text('Close')).tap();

    // Modal must dismiss
    await waitFor(element(by.id('photo-modal')))
      .not.toBeVisible()
      .withTimeout(5000);
  });

  it('edge case: Photos tab for a member with no photos shows the "No photos yet." empty state', async () => {
    await loginAndOpenPhotosTab(TRAINER_EDGE_EMAIL, TRAINER_EDGE_PASSWORD);

    await waitFor(element(by.id('photos-empty-state')))
      .toBeVisible()
      .withTimeout(8000);
    await detoxExpect(element(by.id('photos-empty-state'))).toBeVisible();
    await detoxExpect(element(by.text('No photos yet.'))).toBeVisible();
  });
});
