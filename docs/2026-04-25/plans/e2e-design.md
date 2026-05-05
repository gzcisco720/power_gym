# E2E Test Suite Design

**Date:** 2026-04-25
**Status:** Approved

---

## Goal

Cover all critical user flows across three roles (Owner, Trainer, Member) using Playwright against a dedicated test MongoDB database.

## Architecture

### Playwright Configuration

- **Browser:** Chromium only (speed-first, CI-friendly)
- **Workers:** 1 (serial execution prevents concurrent DB conflicts)
- **webServer:** `pnpm dev` with `MONGODB_URI` overridden to point at `power_gym_test`
- **reuseExistingServer:** `true` — does not restart a running dev server
- **Artifacts:** screenshots and traces captured on failure

### Test Database

- Local MongoDB database: `power_gym_test` (isolated from dev `power_gym`)
- Same MongoDB user (`power_gym_user`) as dev — no new credentials needed
- Connection string stored in `.env.e2e` (gitignored)
- Example: `mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin`

### Global Setup / Teardown

- `e2e/global-setup.ts` — runs before all tests:
  1. Load `.env.e2e` via `dotenv` to get `MONGODB_URI` (runs in Playwright process, not Next.js)
  2. Connect to `power_gym_test`
  3. Drop all collections (clean slate)
  4. Call `seed()` to insert test data
  5. Programmatically log in as each role and save session cookies to `e2e/.auth/`
- `e2e/global-teardown.ts` — drops the test database after all tests complete
- `e2e/seed.ts` — creates all required test data (see Seed Data section)

### Auth Acceleration (storageState)

Global setup saves auth state for each role:
- `e2e/.auth/owner.json`
- `e2e/.auth/trainer.json`
- `e2e/.auth/member.json`

Test files load these via `use: { storageState }`, bypassing the login UI on every test.

---

## Seed Data

All passwords: `TestPass123!`

### Users

| Email | Role | trainerId |
|-------|------|-----------|
| `owner@test.com` | owner | null |
| `trainer@test.com` | trainer | → owner |
| `member@test.com` | member | → trainer |

### Training Data

- **Exercise:** "Bench Press" (global)
- **Plan Template:** "E2E Test Plan" (owned by trainer)
  - Day 1 "Push": Bench Press, 3 sets × 8–12 reps
- **Member Plan:** deep copy of above, assigned to member
- **Workout Session:** 1 completed session for member (1 set logged: 60 kg × 8)
- **Personal Best:** Bench Press, member, 60 kg × 8 → ~75 kg estimated 1RM

### Nutrition Data

- **Food items (global):** "Rice" (per 100g), "Chicken Breast" (per 100g)
- **Nutrition Template:** "E2E Nutrition Template" (owned by trainer)
  - Day type: "Training Day" — 2500 kcal / 180g protein / 280g carbs / 70g fat
  - Meal: "Lunch" — Rice 100g + Chicken Breast 150g
- **Member Nutrition Plan:** deep copy assigned to member

### Body Test Data

- 1 body test for member:
  - Protocol: 3-site (Jackson-Pollock male)
  - Weight: 75 kg
  - Skinfolds: chest 12mm, abdominal 18mm, thigh 14mm
  - Calculated: ~18% BF, ~61.5 kg lean mass, ~13.5 kg fat mass

### Invite Token

- 1 pending invite token:
  - `role: 'trainer'`
  - `recipientEmail: 'newtrainer@test.com'`
  - `token: 'e2e-test-invite-token'`
  - `expiresAt: now + 48h`
  - `invitedBy: owner._id`

---

## Test File Structure

```
e2e/
  global-setup.ts
  global-teardown.ts
  seed.ts
  .auth/                      # gitignored
    owner.json
    trainer.json
    member.json
  auth.spec.ts
  member/
    plan.spec.ts
    pbs.spec.ts
    nutrition.spec.ts
    body-tests.spec.ts
  trainer/
    plans.spec.ts
    members.spec.ts
    nutrition.spec.ts
    body-tests.spec.ts
  owner/
    dashboard.spec.ts
    trainers.spec.ts
    members.spec.ts
    invites.spec.ts
```

---

## Test Coverage

### `auth.spec.ts`

- Owner login → redirected to `/dashboard/owner`
- Trainer login → redirected to `/dashboard/trainer/members`
- Member login → redirected to `/dashboard/member/plan`
- Logout → redirected to `/login`
- Register via seed invite token: navigate to `/register?token=e2e-test-invite-token`, fill form, submit → login succeeds

### `member/plan.spec.ts`

- Page shows plan name "E2E Test Plan"
- Page shows "Bench Press" exercise
- Start session → session page loads
- Enter weight and reps → submit → set shows checkmark

### `member/pbs.spec.ts`

- PB board shows "Bench Press"
- Estimated 1RM value is visible

### `member/nutrition.spec.ts`

- "Training Day" tab is visible
- Macro targets (protein / carbs / fat / kcal) are displayed

### `member/body-tests.spec.ts`

- Latest test card shows weight (75 kg) and body fat (~18%)

### `trainer/plans.spec.ts`

- Template list shows "E2E Test Plan"
- Create new template: fill name, add day, add exercise, save → appears in list
- Assign plan to member → member plan page shows new plan

### `trainer/members.spec.ts`

- Member list shows `member@test.com`
- Click through to member detail → plan assignment page loads

### `trainer/nutrition.spec.ts`

- Nutrition template list shows "E2E Nutrition Template"
- Create new template: fill name, add day type, set macros, save → appears in list

### `trainer/body-tests.spec.ts`

- Navigate to member body tests page
- Select 3-site protocol, enter skinfold values + weight, submit
- New test record appears in history list

### `owner/dashboard.spec.ts`

- Page shows 4 stat cards: Trainers, Members, Sessions / mo, Pending Invites
- Trainer breakdown table shows `trainer@test.com` row

### `owner/trainers.spec.ts`

- Trainer list shows `trainer@test.com`
- Expand "Members" → shows `member@test.com`

### `owner/members.spec.ts`

- Member list shows `member@test.com`
- Trainer column shows trainer name

### `owner/invites.spec.ts`

- Create invite via POST `/api/owner/invites` → get `inviteUrl` from response
- Navigate to `inviteUrl` → register form loads with email pre-validation
- Fill in name + password → submit → login with new credentials succeeds

---

## File Configuration

### `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      MONGODB_URI: 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin',
    },
  },
});
```

### `.env.e2e`

```
MONGODB_URI=mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin
```

### `package.json` additions

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

---

## Constraints

- `e2e/.auth/` and `.env.e2e` are gitignored
- Tests are read-only where possible; only auth.spec and trainer/owner mutation tests write data
- Seed runs fresh before every full test run — no test depends on state left by another
- `trainer/body-tests.spec.ts` and `trainer/plans.spec.ts` write new records; they verify the new record appears rather than asserting exact counts
