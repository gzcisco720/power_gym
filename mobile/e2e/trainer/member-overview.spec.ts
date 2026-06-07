/**
 * Member Detail Overview tab E2E — Detox on iOS Simulator
 *
 * Tests the Gap 2 KPI strip, Active Plan card, Health panel, and training
 * heatmap added in Sprint 8 Stage 5.
 *
 * SETUP REQUIRED BEFORE RUNNING:
 * 1. Build the Detox app (if not already built):
 *    cd mobile && pnpm detox:build
 *
 * 2. Start the backend:
 *    cd backend && pnpm start:dev
 *
 * 3. Run the E2E tests:
 *    cd mobile && pnpm detox:test --testPathPattern=trainer/member-overview
 *
 * NOTE: This spec requires:
 * - A booted iOS simulator
 * - The backend running at EXPO_PUBLIC_API_URL (default: http://localhost:3001)
 * - The backend /auth/dev/seed-user-role endpoint available (dev mode only)
 * - The backend /members/dev/seed-overview-stats endpoint available (dev mode only)
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const TS = Date.now();
const TRAINER_EMAIL = `trainer-member-overview-${TS}@powergym.com`;
const TRAINER_PASSWORD = 'TrainerPass123!';

// Member WITH seeded overview stats (sessions, body tests, active plan, injuries, medications)
const MEMBER_EMAIL = `member-overview-${TS}@powergym.com`;
const MEMBER_PASSWORD = 'MemberPass123!';

// Member WITHOUT any seeded overview stats (no active plan)
const MEMBER_NO_PLAN_EMAIL = `member-overview-noplan-${TS}@powergym.com`;
const MEMBER_NO_PLAN_PASSWORD = 'MemberPass123!';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

let memberId: string;
let memberNoPlanId: string;

async function seedUsers() {
  // Seed trainer
  await fetch(`${API_URL}/auth/dev/seed-user-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TRAINER_EMAIL,
      password: TRAINER_PASSWORD,
      role: 'trainer',
    }),
  });

  // Seed member WITH overview stats, assigned to the trainer
  const memberRes = await fetch(`${API_URL}/auth/dev/seed-user-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      role: 'member',
      trainerEmail: TRAINER_EMAIL,
    }),
  });
  const memberData = (await memberRes.json()) as { id: string };
  memberId = memberData.id;

  // Seed overview stats (sessions, body tests, active plan, injuries, medications)
  await fetch(`${API_URL}/members/dev/seed-overview-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });

  // Seed member WITHOUT overview stats, assigned to the same trainer
  const memberNoPlanRes = await fetch(`${API_URL}/auth/dev/seed-user-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: MEMBER_NO_PLAN_EMAIL,
      password: MEMBER_NO_PLAN_PASSWORD,
      role: 'member',
      trainerEmail: TRAINER_EMAIL,
    }),
  });
  const memberNoPlanData = (await memberNoPlanRes.json()) as { id: string };
  memberNoPlanId = memberNoPlanData.id;
  // No seed-overview-stats call — this member has no active plan
}

async function loginAsTrainer() {
  await device.clearKeychain();
  await device.setBiometricEnrollment(false);
  await device.launchApp({ newInstance: true });
  await device.disableSynchronization();

  await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(15000);
  await element(by.id('login-email-input')).typeText(TRAINER_EMAIL);
  await element(by.id('login-password-input')).typeText(TRAINER_PASSWORD);
  await element(by.id('login-sign-in-button')).tap();
  await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(15000);
}

async function navigateToMembersScreen() {
  await waitFor(element(by.id('drawer-hamburger'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-hamburger')).tap();
  await waitFor(element(by.id('drawer-item-Members'))).toBeVisible().withTimeout(10000);
  await element(by.id('drawer-item-Members')).tap();
  await waitFor(element(by.id('screen-Members'))).toBeVisible().withTimeout(10000);
}

async function navigateToMemberOverview(targetMemberId: string) {
  await waitFor(element(by.id(`member-row-${targetMemberId}`))).toBeVisible().withTimeout(10000);
  await element(by.id(`member-row-${targetMemberId}`)).tap();
  await waitFor(element(by.id('screen-MemberDetail'))).toBeVisible().withTimeout(10000);

  // Overview tab is active by default
  await waitFor(element(by.id('member-detail-tab-overview'))).toBeVisible().withTimeout(5000);
}

describe('Trainer: Member Detail — Overview tab', () => {
  beforeAll(async () => {
    await seedUsers();
  });

  beforeEach(async () => {
    await loginAsTrainer();
    await navigateToMembersScreen();
  });

  it('shows KPI strip, Active Plan card, Health panel, and training heatmap with seeded data', async () => {
    await navigateToMemberOverview(memberId);

    // KPI strip: sessions this month cell
    await waitFor(element(by.id('kpi-sessions'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('kpi-sessions'))).toBeVisible();

    // Weight KPI cell
    await waitFor(element(by.id('kpi-weight-value'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('kpi-weight-value'))).toBeVisible();

    // Active Plan card — populated state (not empty, plan was seeded)
    await waitFor(element(by.id('active-plan-card'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('active-plan-card'))).toBeVisible();

    // Health panel: injury and medication counts
    await waitFor(element(by.id('health-injury-count'))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id('health-injury-count'))).toBeVisible();
    await detoxExpect(element(by.id('health-medication-count'))).toBeVisible();

    // Quick-link buttons are present
    await detoxExpect(element(by.id('overview-link-bodytests'))).toBeVisible();
    await detoxExpect(element(by.id('overview-link-health'))).toBeVisible();

    // Training heatmap: at least one cell is visible
    await waitFor(element(by.id(/^heatmap-cell-/))).toBeVisible().withTimeout(5000);
    await detoxExpect(element(by.id(/^heatmap-cell-/))).toBeVisible();
  });

  it('shows "No plan assigned" when the member has no active training plan', async () => {
    await navigateToMemberOverview(memberNoPlanId);

    // Active Plan card shows the empty placeholder
    await waitFor(element(by.id('active-plan-empty'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('active-plan-empty'))).toBeVisible();
  });
});
