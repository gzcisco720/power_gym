/**
 * Trainer Assign Plan E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/assign-plan
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeding assumptions:
 * - Seeding a trainer with seedMembers: true creates a member with email
 *   `seed-members-member-for-{TRAINER_EMAIL}` and sets member.User.trainerId
 *   to the trainer's user id (confirmed in AuthDevController.seedMembersData).
 * - The trainer's token is used to create plan templates via POST /plan-templates.
 * - Do NOT use /training/dev/seed — member must start with no plan so the
 *   "Assign" path (not "Reassign") is exercised in the golden path.
 *
 * Golden path:
 *   Trainer logs in → Members → member card → Training tab →
 *   "No plan assigned" + Assign button visible →
 *   tap Assign → assign-plan-sheet visible with template rows →
 *   tap template → sheet closes, Active Plan shows template name,
 *   log-session-day-1 visible →
 *   tap Reassign → sheet reopens → tap second template →
 *   Active Plan name updates to second template
 *
 * Edge case:
 *   Trainer with no templates opens the sheet →
 *   empty-state "No training templates available." is visible.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-assign-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

// Trainer for the no-templates edge case
const NOTEMPL_TRAINER_EMAIL = `trainer-notempl-${TS}@powergym.com`;
const NOTEMPL_TRAINER_PASSWORD = 'TrainerPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const TEMPLATE_A_NAME = `Plan Alpha ${TS}`;
const TEMPLATE_B_NAME = `Plan Beta ${TS}`;

async function loginAs(email: string, password: string) {
  await device.clearKeychain();
  await device.setBiometricEnrollment(false);
  await device.launchApp({ newInstance: true });
  await device.disableSynchronization();

  await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
  await element(by.id('login-email-input')).typeText(email);
  await element(by.id('login-password-input')).typeText(password);
  await element(by.id('login-sign-in-button')).tap();

  await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
}

async function navigateToMembers() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Members')).tap();
  await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
}

async function openMemberTrainingTab() {
  await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
  await element(by.id(/^member-card-/)).tap();
  await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);
  await element(by.id('member-detail-tab-training')).tap();
}

describe('Trainer: Assign Training Plan to Member', () => {
  beforeAll(async () => {
    // Seed trainer with a member assigned to them
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TRAINER_EMAIL,
        password: TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });

    // Log in as the trainer to get a token for creating plan templates
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    // Create two plan templates so the reassign path can be tested
    for (const name of [TEMPLATE_A_NAME, TEMPLATE_B_NAME]) {
      await fetch(`${API_URL}/plan-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          description: null,
          days: [
            {
              dayNumber: 1,
              name: 'Day 1',
              exercises: [
                {
                  groupId: 'g1',
                  isSuperset: false,
                  exerciseId: '000000000000000000000001',
                  exerciseName: 'Bench Press',
                  imageUrl: null,
                  isBodyweight: false,
                  sets: 2,
                  repsMin: 8,
                  repsMax: 12,
                  restSeconds: 90,
                },
              ],
            },
          ],
        }),
      });
    }

    // Seed a second trainer with a member but NO templates created (edge case)
    await fetch(`${API_URL}/auth/dev/seed-user-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: NOTEMPL_TRAINER_EMAIL,
        password: NOTEMPL_TRAINER_PASSWORD,
        role: 'trainer',
        seedMembers: true,
      }),
    });
  });

  describe('golden path: assign then reassign a training plan', () => {
    beforeEach(async () => {
      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMembers();
    });

    it('Training tab shows "No plan assigned" and Assign button when member has no plan', async () => {
      await openMemberTrainingTab();

      // "No plan assigned" placeholder text must be visible
      await waitFor(element(by.text('No plan assigned'))).toBeVisible().withTimeout(8000);

      // Assign button must be visible
      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
    });

    it('tapping Assign opens the sheet and lists template rows', async () => {
      await openMemberTrainingTab();

      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
      await element(by.id('assign-plan-button')).tap();

      // Sheet must be visible
      await waitFor(element(by.id('assign-plan-sheet'))).toBeVisible().withTimeout(8000);

      // Both template rows must be present
      await waitFor(element(by.id(`template-result-${TEMPLATE_A_NAME}`))).toBeVisible().withTimeout(8000);
      await waitFor(element(by.id(`template-result-${TEMPLATE_B_NAME}`))).toBeVisible().withTimeout(8000);
    });

    it('tapping a template assigns the plan, closes the sheet, shows the plan name, and reveals log-session-day-1', async () => {
      await openMemberTrainingTab();

      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
      await element(by.id('assign-plan-button')).tap();

      await waitFor(element(by.id('assign-plan-sheet'))).toBeVisible().withTimeout(8000);
      await waitFor(element(by.id(`template-result-${TEMPLATE_A_NAME}`))).toBeVisible().withTimeout(8000);
      await element(by.id(`template-result-${TEMPLATE_A_NAME}`)).tap();

      // Sheet must close
      await waitFor(element(by.id('assign-plan-sheet'))).not.toBeVisible().withTimeout(8000);

      // Active Plan row must show the assigned plan name
      await waitFor(element(by.text(TEMPLATE_A_NAME))).toBeVisible().withTimeout(8000);

      // log-session-day-1 must appear (proves Stage 2 refresh fix)
      await waitFor(element(by.id('log-session-day-1'))).toBeVisible().withTimeout(8000);
    });

    it('Reassign affordance reopens the sheet; picking a different template updates the Active Plan name', async () => {
      await openMemberTrainingTab();

      // Assign the first template
      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
      await element(by.id('assign-plan-button')).tap();
      await waitFor(element(by.id(`template-result-${TEMPLATE_A_NAME}`))).toBeVisible().withTimeout(8000);
      await element(by.id(`template-result-${TEMPLATE_A_NAME}`)).tap();
      await waitFor(element(by.text(TEMPLATE_A_NAME))).toBeVisible().withTimeout(8000);

      // Reassign button must now be visible (same testID, different label)
      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
      await element(by.id('assign-plan-button')).tap();

      // Sheet reopens
      await waitFor(element(by.id('assign-plan-sheet'))).toBeVisible().withTimeout(8000);

      // Pick the second template
      await waitFor(element(by.id(`template-result-${TEMPLATE_B_NAME}`))).toBeVisible().withTimeout(8000);
      await element(by.id(`template-result-${TEMPLATE_B_NAME}`)).tap();

      // Sheet closes and Active Plan name updates to second template
      await waitFor(element(by.id('assign-plan-sheet'))).not.toBeVisible().withTimeout(8000);
      await waitFor(element(by.text(TEMPLATE_B_NAME))).toBeVisible().withTimeout(8000);
    });
  });

  describe('edge case: trainer with no templates sees empty state', () => {
    beforeEach(async () => {
      await loginAs(NOTEMPL_TRAINER_EMAIL, NOTEMPL_TRAINER_PASSWORD);
      await navigateToMembers();
    });

    it('opening assign-plan-sheet with no templates shows the empty-state message', async () => {
      await openMemberTrainingTab();

      await waitFor(element(by.id('assign-plan-button'))).toBeVisible().withTimeout(8000);
      await element(by.id('assign-plan-button')).tap();

      // Sheet must be visible
      await waitFor(element(by.id('assign-plan-sheet'))).toBeVisible().withTimeout(8000);

      // Empty-state message must be visible
      await waitFor(element(by.text('No training templates available.'))).toBeVisible().withTimeout(8000);

      // No template rows should exist
      await detoxExpect(element(by.id(/^template-result-/))).not.toBeVisible();
    });
  });
});
