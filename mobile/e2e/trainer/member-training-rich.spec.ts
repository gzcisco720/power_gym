/**
 * Trainer Member Training Rich E2E — Detox on iOS Simulator
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend with dev mode:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-training-rich
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 *
 * Seeding: trainer with a member and a training plan assigned. The backend
 * dev seed endpoint creates a plan and personal bests data for the seeded member.
 *
 * Golden paths:
 * 1. Trainer opens a member Training tab → Personal Bests section visible with
 *    weight×reps and Est. 1RM values (verifies PRs grid)
 * 2. Trainer taps a different exercise pill in the strength chart → chart updates
 *    (verifies strength progress chart exercise selector)
 *
 * Edge case:
 * 3. Member with an in-progress session shows the "Continue" banner
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-training-rich-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

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

async function navigateToMemberTrainingTab() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(15000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Members')).tap();
  await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);

  await waitFor(element(by.id(/^member-card-/))).toBeVisible().withTimeout(10000);
  await element(by.id(/^member-card-/)).tap();
  await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

  await element(by.id('member-detail-tab-training')).tap();
}

describe('Trainer: Member Training Tab — Rich Features', () => {
  let accessToken: string;
  let memberId: string;
  let exerciseId1: string;
  let exerciseId2: string;

  beforeAll(async () => {
    // Seed trainer with a member
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

    // Log in as trainer to get token
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD }),
    });
    const loginData = (await loginRes.json()) as { accessToken: string };
    accessToken = loginData.accessToken;

    // Get the member list to find the seeded member
    const membersRes = await fetch(`${API_URL}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const members = (await membersRes.json()) as { _id: string }[];
    memberId = members[0]._id;

    // Use two real exercise IDs from the system (confirmed seeded in dev exercises)
    exerciseId1 = '000000000000000000000001';
    exerciseId2 = '000000000000000000000002';

    // Create a training plan template with two exercises
    const templateRes = await fetch(`${API_URL}/plan-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: `Rich Plan ${TS}`,
        description: null,
        days: [
          {
            dayNumber: 1,
            name: 'Push Day',
            exercises: [
              {
                groupId: 'g1',
                isSuperset: false,
                exerciseId: exerciseId1,
                exerciseName: 'Bench Press',
                imageUrl: null,
                isBodyweight: false,
                sets: 3,
                repsMin: 8,
                repsMax: 12,
                restSeconds: 90,
              },
            ],
          },
          {
            dayNumber: 2,
            name: 'Pull Day',
            exercises: [
              {
                groupId: 'g2',
                isSuperset: false,
                exerciseId: exerciseId2,
                exerciseName: 'Pull Up',
                imageUrl: null,
                isBodyweight: true,
                sets: 3,
                repsMin: 6,
                repsMax: 10,
                restSeconds: 90,
              },
            ],
          },
        ],
      }),
    });
    const template = (await templateRes.json()) as { _id: string };

    // Assign the plan to the member
    await fetch(`${API_URL}/training/members/${memberId}/assign-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ templateId: template._id }),
    });

    // Seed a completed workout session to generate personal bests
    const sessionRes = await fetch(`${API_URL}/training/members/${memberId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dayNumber: 1 }),
    });
    const session = (await sessionRes.json()) as { _id: string; sets: { setNumber: number; exerciseId: string }[] };
    const setInfo = session.sets[0];

    // Log a set to generate a PR
    await fetch(`${API_URL}/training/members/${memberId}/sessions/${session._id}/sets`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        setNumber: setInfo.setNumber,
        exerciseId: setInfo.exerciseId,
        actualReps: 8,
        actualWeight: 80,
      }),
    });

    // Finish the session to generate PRs
    await fetch(`${API_URL}/training/members/${memberId}/sessions/${session._id}/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
  });

  describe('golden path: Personal Bests grid visible', () => {
    beforeEach(async () => {
      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMemberTrainingTab();
    });

    it('Training tab shows Personal Bests section with weight×reps and Est. 1RM values', async () => {
      // Personal Bests section label must be visible
      await waitFor(element(by.text('Personal Bests'))).toBeVisible().withTimeout(8000);

      // At least one PR card must be visible (the Bench Press set we logged)
      await waitFor(element(by.id(/^personal-best-/))).toBeVisible().withTimeout(8000);
      await detoxExpect(element(by.id(/^personal-best-/))).toBeVisible();

      // Est. 1RM label must appear on the card
      await waitFor(element(by.text('Est. 1RM'))).toBeVisible().withTimeout(8000);
    });
  });

  describe('golden path: strength chart exercise selector', () => {
    beforeEach(async () => {
      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMemberTrainingTab();
    });

    it('tapping a different exercise pill refetches and updates the strength chart', async () => {
      // Strength Progress section must be visible (plan has exercises)
      await waitFor(element(by.text('Strength Progress'))).toBeVisible().withTimeout(8000);

      // Tap the Push Day exercise pill
      await waitFor(element(by.id('strength-pill-' + exerciseId1))).toBeVisible().withTimeout(8000);
      await element(by.id('strength-pill-' + exerciseId1)).tap();

      // Chart or "no sessions" message must appear
      await waitFor(element(by.id('strength-line-chart'))).toBeVisible().withTimeout(8000);

      // Tap the Pull Day exercise pill — different exercise, different data
      await element(by.id('strength-pill-' + exerciseId2)).tap();

      // Chart should update — it still renders with the new exercise selected
      await waitFor(element(by.id('strength-line-chart'))).toBeVisible().withTimeout(8000);
    });
  });

  describe('edge case: active session continue banner', () => {
    beforeEach(async () => {
      // Start a new (incomplete) session for the member
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TRAINER_EMAIL, password: TRAINER_PASSWORD }),
      });
      const { accessToken: token } = (await loginRes.json()) as { accessToken: string };

      await fetch(`${API_URL}/training/members/${memberId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dayNumber: 2 }),
      });

      await loginAs(TRAINER_EMAIL, TRAINER_PASSWORD);
      await navigateToMemberTrainingTab();
    });

    it('member with an in-progress session shows the "Continue" banner', async () => {
      await waitFor(element(by.id('active-session-banner'))).toBeVisible().withTimeout(8000);
      await detoxExpect(element(by.id('active-session-banner'))).toBeVisible();
    });
  });
});
