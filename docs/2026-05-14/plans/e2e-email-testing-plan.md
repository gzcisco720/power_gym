# E2E Email Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real email delivery assertions to existing e2e tests using Mailpit, covering 8 email scenarios across 7 spec files.

**Architecture:** A shared `e2e/helpers/mailpit.ts` module provides `waitForEmailTo` (polls Mailpit's search API until matching email arrives) and `clearInbox` (deletes all messages for test isolation). Each spec file clears the inbox before triggering the email, then asserts on subject and HTML body. The `pnpm test:e2e` script is updated to start Mailpit via docker-compose first.

**Tech Stack:** Playwright, Mailpit REST API (`GET /api/v1/search`, `GET /api/v1/message/{ID}`, `DELETE /api/v1/messages`), docker-compose

---

## File Map

| File | Change |
|---|---|
| `package.json` | Update `test:e2e` and `test:e2e:ui` scripts to start Mailpit first |
| `e2e/helpers/mailpit.ts` | New — `waitForEmailTo`, `clearInbox` |
| `e2e/seed.ts` | Add `reset-test@test.com` member user |
| `e2e/auth.spec.ts` | Add email assertion to "forgot-password" + new full reset-flow test |
| `e2e/owner/invites.spec.ts` | Add email assertion to "full invite flow" |
| `e2e/trainer/invites.spec.ts` | Add email assertion to "full invite flow" |
| `e2e/trainer/members.spec.ts` | Add email assertion to "assign plan to member" |
| `e2e/owner/members.spec.ts` | Add email assertion to "reassign member" |
| `e2e/owner/calendar.spec.ts` | Add email assertions to "create session" + "cancel session" |
| `e2e/member/check-in.spec.ts` | Add email assertion to "submit check-in" |

---

### Task 1: Update test:e2e script + create Mailpit helper

**Files:**
- Modify: `package.json`
- Create: `e2e/helpers/mailpit.ts`

- [ ] **Step 1: Update package.json scripts**

In `package.json`, change `test:e2e` and `test:e2e:ui` to start Mailpit before running Playwright:

```json
"test:e2e": "docker-compose up -d mailpit; lsof -ti tcp:3000 | xargs kill 2>/dev/null; playwright test",
"test:e2e:ui": "docker-compose up -d mailpit; lsof -ti tcp:3000 | xargs kill 2>/dev/null; playwright test --ui",
```

- [ ] **Step 2: Create `e2e/helpers/mailpit.ts`**

```typescript
const MAILPIT_API = 'http://localhost:8025/api/v1';

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string; Name: string }[];
}

interface MailpitSearchResponse {
  messages: MailpitSummary[];
  total: number;
}

export interface MailpitMessage {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
  To: { Address: string; Name: string }[];
  From: { Address: string; Name: string };
}

export async function clearInbox(): Promise<void> {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' });
}

export async function waitForEmailTo(
  to: string,
  options: { subject?: RegExp; timeout?: number } = {},
): Promise<MailpitMessage> {
  const { subject, timeout = 5000 } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT_API}/search?query=${encodeURIComponent(`to:${to}`)}&limit=20`,
    );
    if (res.ok) {
      const data = (await res.json()) as MailpitSearchResponse;
      const match = data.messages.find(
        (m) => !subject || subject.test(m.Subject),
      );
      if (match) {
        const detail = await fetch(`${MAILPIT_API}/message/${match.ID}`);
        return (await detail.json()) as MailpitMessage;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(
    `Timeout (${timeout}ms) waiting for email to "${to}"` +
      (subject ? ` matching subject ${subject}` : ''),
  );
}
```

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add package.json e2e/helpers/mailpit.ts
git commit -m "feat(e2e): add Mailpit helper and auto-start in test:e2e script"
```

---

### Task 2: Add reset-test user to seed

**Files:**
- Modify: `e2e/seed.ts` — add one user after the existing `Hub Reassign` user (around line 80)

- [ ] **Step 1: Add user to seed**

In `e2e/seed.ts`, after the `hub-reassign@test.com` user creation block, add:

```typescript
// Dedicated user for password-reset e2e test — role member so login lands on /member/plan
const resetTestUser = await UserModel.create({
  firstName: 'Reset',
  lastName: 'Test',
  email: 'reset-test@test.com',
  passwordHash,
  role: 'member',
  trainerId: trainer._id,
});
```

> Note: `resetTestUser` variable is declared but not referenced by any other seed data — that is intentional.

- [ ] **Step 2: Verify seed compiles**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add e2e/seed.ts
git commit -m "feat(e2e): add reset-test@test.com seed user for password-reset flow"
```

---

### Task 3: auth.spec.ts — password reset email

**Files:**
- Modify: `e2e/auth.spec.ts`

The "forgot-password" test currently only checks the UI confirmation message. Augment it to also verify the email arrives. Then add a new test for the complete reset flow.

- [ ] **Step 1: Augment existing forgot-password test**

Replace the existing `'forgot-password shows confirmation regardless of email'` test with:

```typescript
test('forgot-password sends reset email to known user', async ({ page }) => {
  await clearInbox();

  await page.goto('/forgot-password');
  await page.fill('input[type="email"]', 'reset-test@test.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('If that email exists')).toBeVisible();

  const email = await waitForEmailTo('reset-test@test.com');
  expect(email.Subject).toBe('Reset your POWER GYM password');
  expect(email.HTML).toContain('reset-password');
});
```

Add the import at the top of the file:
```typescript
import { clearInbox, waitForEmailTo } from './helpers/mailpit';
```

- [ ] **Step 2: Add full reset-flow test**

Append this test inside the `'Authentication'` describe block:

```typescript
test('forgot-password reset link works end-to-end', async ({ page }) => {
  await clearInbox();

  // 1. Submit forgot-password for the dedicated reset-test user
  await page.goto('/forgot-password');
  await page.fill('input[type="email"]', 'reset-test@test.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  // 2. Get email and extract the reset URL from the HTML
  const email = await waitForEmailTo('reset-test@test.com', {
    subject: /Reset your POWER GYM password/,
  });
  const match = email.HTML.match(/href="(http:\/\/[^"]*reset-password[^"]*)"/);
  expect(match).not.toBeNull();
  const resetUrl = match![1];

  // 3. Navigate to the reset URL and set a new password
  await page.goto(resetUrl);
  await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible();
  await page.fill('input[type="password"]', 'NewPass456!');
  // Some reset forms have a confirm field
  const confirmInput = page.locator('input[name="confirmPassword"], input[id="confirmPassword"]');
  if (await confirmInput.count() > 0) {
    await confirmInput.fill('NewPass456!');
  }
  await page.getByRole('button', { name: /reset|save|update/i }).click();

  // 4. Should redirect to login with a success message or land on login
  await page.waitForURL(/\/login/);

  // 5. Log in with the new password
  await page.fill('#email', 'reset-test@test.com');
  await page.fill('#password', 'NewPass456!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/member/plan');
  await expect(page).toHaveURL('/member/plan');
});
```

- [ ] **Step 3: Run auth spec to verify**

Run: `pnpm test:e2e -- --grep "forgot-password"`
Expected: both tests pass (Mailpit must be running)

- [ ] **Step 4: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "feat(e2e): verify password reset email delivery and full reset flow"
```

---

### Task 4: owner/invites.spec.ts — invite email

**Files:**
- Modify: `e2e/owner/invites.spec.ts`

The invite API returns `inviteUrl` in the JSON response. The email should contain the same URL plus the correct subject.

- [ ] **Step 1: Augment "full invite flow" test**

Add import at the top:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

In the existing `'full invite flow: create invite, register, login succeeds'` test, add email assertions immediately after `expect(response.ok()).toBeTruthy()`:

```typescript
test('full invite flow: create invite, register, login succeeds', async ({ page, browser }) => {
  await clearInbox();

  const response = await page.request.post('/api/owner/invites', {
    data: { recipientEmail: 'e2einvite@test.com', role: 'trainer' },
  });
  expect(response.ok()).toBeTruthy();
  const { inviteUrl } = (await response.json()) as { inviteUrl: string };

  // Verify invite email
  const email = await waitForEmailTo('e2einvite@test.com');
  expect(email.Subject).toContain('Trainer');
  expect(email.HTML).toContain(inviteUrl);

  // Existing registration flow (unchanged)
  const freshCtx = await browser.newContext();
  const freshPage = await freshCtx.newPage();

  await freshPage.goto(inviteUrl);
  await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

  await freshPage.fill('#firstName', 'E2E');
  await freshPage.fill('#lastName', 'InviteUser');
  await freshPage.fill('#email', 'e2einvite@test.com');
  await freshPage.fill('#password', 'TestPass123!');
  await freshPage.getByRole('button', { name: /create account/i }).click();
  await freshPage.waitForURL('/trainer/members');
  await expect(freshPage).toHaveURL('/trainer/members');

  await freshCtx.close();
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test:e2e -- --grep "Owner: Invites"`
Expected: both tests pass

- [ ] **Step 3: Commit**

```bash
git add e2e/owner/invites.spec.ts
git commit -m "feat(e2e): verify invite email delivery in owner invite flow"
```

---

### Task 5: trainer/invites.spec.ts — invite email

**Files:**
- Modify: `e2e/trainer/invites.spec.ts`

Mirror of Task 4 but for the trainer invite flow (member role).

- [ ] **Step 1: Augment "full invite flow" test**

Add import at the top:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

Replace the existing `'full invite flow: create invite, register as member, login succeeds'` test:

```typescript
test('full invite flow: create invite, register as member, login succeeds', async ({ page, browser }) => {
  await clearInbox();

  const response = await page.request.post('/api/trainer/invites', {
    data: { recipientEmail: 'e2etrainerinvite@test.com' },
  });
  expect(response.ok()).toBeTruthy();
  const { inviteUrl } = (await response.json()) as { inviteUrl: string };

  // Verify invite email
  const email = await waitForEmailTo('e2etrainerinvite@test.com');
  expect(email.Subject).toContain('Member');
  expect(email.HTML).toContain(inviteUrl);

  // Existing registration flow (unchanged)
  const freshCtx = await browser.newContext();
  const freshPage = await freshCtx.newPage();

  await freshPage.goto(inviteUrl);
  await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

  await freshPage.fill('#firstName', 'E2E');
  await freshPage.fill('#lastName', 'TrainerInviteUser');
  await freshPage.fill('#email', 'e2etrainerinvite@test.com');
  await freshPage.fill('#password', 'TestPass123!');
  await freshPage.getByRole('button', { name: /create account/i }).click();
  await freshPage.waitForURL('/member/plan');
  await expect(freshPage).toHaveURL('/member/plan');

  await freshCtx.close();
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test:e2e -- --grep "Trainer: Invites"`
Expected: both tests pass

- [ ] **Step 3: Commit**

```bash
git add e2e/trainer/invites.spec.ts
git commit -m "feat(e2e): verify invite email delivery in trainer invite flow"
```

---

### Task 6: trainer/members.spec.ts — plan assigned email

**Files:**
- Modify: `e2e/trainer/members.spec.ts`

The existing "assign plan to member via hub" test assigns "E2E Test Plan" to `member@test.com`. The email subject is `Your Training Plan Has Been Updated — POWER GYM` and body contains plan name and trainer name.

- [ ] **Step 1: Add import and email assertion**

Add import at the top of the file:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

In the existing `'assign plan to member via hub'` test, add `clearInbox()` at the start and email assertions at the end:

```typescript
test('assign plan to member via hub', async ({ page }) => {
  await clearInbox();

  await page.goto('/trainer/members');
  await page.getByText('Test Member').click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await page.waitForURL(/\/trainer\/members\/.+\/plan/);

  await page.getByRole('button', { name: 'Change Plan' }).click();
  await expect(page.getByLabel('Select plan template')).toBeVisible();
  await page.getByLabel('Select plan template').selectOption({ label: 'E2E Test Plan' });
  await page.getByRole('button', { name: 'Assign', exact: true }).click();

  await expect(page.getByText('E2E Test Plan').first()).toBeVisible();

  // Verify plan assigned email
  const email = await waitForEmailTo('member@test.com', {
    subject: /Training Plan/,
  });
  expect(email.Subject).toBe('Your Training Plan Has Been Updated — POWER GYM');
  expect(email.HTML).toContain('E2E Test Plan');
  expect(email.HTML).toContain('Test Trainer');
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test:e2e -- --grep "assign plan to member"`
Expected: test passes

- [ ] **Step 3: Commit**

```bash
git add e2e/trainer/members.spec.ts
git commit -m "feat(e2e): verify plan-assigned email in trainer assign plan flow"
```

---

### Task 7: owner/members.spec.ts — member assigned email

**Files:**
- Modify: `e2e/owner/members.spec.ts`

The existing "reassign member" test reassigns `reassign-member@test.com` to "Test Trainer2". The `sendMemberAssigned` email goes to the NEW trainer (`trainer2@test.com`). Subject: `New Member(s) Assigned to You — POWER GYM`.

- [ ] **Step 1: Add import and email assertion**

Add import at the top:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

In the existing `'reassign member to a different trainer'` test, add `clearInbox()` at the start and email assertion after the reassignment confirmation:

```typescript
test('reassign member to a different trainer', async ({ page }) => {
  await clearInbox();

  await page.goto('/owner/members');
  const memberRow = page.getByText('reassign-member@test.com', { exact: true }).locator('..').locator('..');
  await memberRow.getByRole('button', { name: /reassign/i }).click();

  await page.selectOption('select', { label: 'Test Trainer2' });
  await page.getByRole('button', { name: /confirm/i }).click();

  await expect(
    page.getByText('reassign-member@test.com', { exact: true })
      .locator('..').locator('..')
      .getByText('Test Trainer2'),
  ).toBeVisible({ timeout: 10000 });

  // Verify member-assigned email sent to the receiving trainer
  const email = await waitForEmailTo('trainer2@test.com', {
    subject: /New Member/,
  });
  expect(email.Subject).toBe('New Member(s) Assigned to You — POWER GYM');
  expect(email.HTML).toContain('Reassign Member');
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test:e2e -- --grep "reassign member"`
Expected: test passes

- [ ] **Step 3: Commit**

```bash
git add e2e/owner/members.spec.ts
git commit -m "feat(e2e): verify member-assigned email in owner reassign flow"
```

---

### Task 8: owner/calendar.spec.ts — session booked + cancelled emails

**Files:**
- Modify: `e2e/owner/calendar.spec.ts`

Two tests to augment: "can create a one-off session" (sends `sendSessionBooked` to `member@test.com`) and "can cancel a session" (sends `sendSessionCancelled` to `member@test.com`).

- [ ] **Step 1: Add import**

Add at the top of `e2e/owner/calendar.spec.ts`:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

- [ ] **Step 2: Augment "can cancel a session" test**

```typescript
test('can cancel a session from the edit modal', async ({ page }) => {
  await clearInbox();

  await page.goto('/owner/calendar');
  await nextWeekBtn(page).click();
  await page.getByRole('button').filter({ hasText: '14:00–15:00' }).click();
  await expect(page.getByText('Edit Session')).toBeVisible();
  await page.getByRole('button', { name: /cancel session/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button').filter({ hasText: '14:00–15:00' })).not.toBeVisible();

  // Verify cancellation email
  const email = await waitForEmailTo('member@test.com', {
    subject: /Cancelled/,
  });
  expect(email.Subject).toBe('Session Cancelled — POWER GYM');
  expect(email.HTML).toContain('cancelled');
});
```

- [ ] **Step 3: Augment "can create a one-off session" test**

```typescript
test('can create a one-off session via slot click', async ({ page }) => {
  await clearInbox();

  await page.goto('/owner/calendar');
  await page.locator('div.cursor-pointer').first().click();
  await expect(page.getByRole('dialog').getByText('New Training Session')).toBeVisible();
  await page.getByRole('dialog').locator('select').selectOption({ label: 'Test Trainer' });
  await page.getByRole('dialog').getByRole('button', { name: 'Test Member' }).click();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.locator('#sessionDate').fill(tomorrow);
  await page.locator('#startTime').fill('11:00');
  await page.locator('#endTime').fill('12:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // Verify booking email
  const email = await waitForEmailTo('member@test.com', {
    subject: /Session Booked/,
  });
  expect(email.Subject).toBe('Session Booked — POWER GYM');
  expect(email.HTML).toContain('Test Trainer');
  expect(email.HTML).toContain('11:00');
});
```

- [ ] **Step 4: Run to verify**

Run: `pnpm test:e2e -- --grep "Owner: Calendar"`
Expected: all calendar tests pass

- [ ] **Step 5: Commit**

```bash
git add e2e/owner/calendar.spec.ts
git commit -m "feat(e2e): verify session booked and cancelled email delivery"
```

---

### Task 9: member/check-in.spec.ts — check-in received email

**Files:**
- Modify: `e2e/member/check-in.spec.ts`

The existing "can submit the check-in form" test submits a check-in which triggers `sendCheckInReceived` to `trainer@test.com`. Subject: `Test Member submitted a check-in — POWER GYM`.

- [ ] **Step 1: Add import and email assertion**

Add import at the top:
```typescript
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';
```

In the existing `'can submit the check-in form and sees confirmation'` test, add `clearInbox()` at the start and email assertion at the end:

```typescript
test('can submit the check-in form and sees confirmation', async ({ page }) => {
  await clearInbox();

  await page.goto('/member/check-in');

  await page.getByPlaceholder('Describe your diet this week...').fill('Ate clean all week');
  await page.getByPlaceholder('How are you feeling overall?').fill('Great energy levels');
  await page.getByRole('button', { name: 'Submit Check-In' }).click();

  await expect(page.getByText("You've already submitted your check-in this week.")).toBeVisible();

  // Verify notification email sent to the trainer
  const email = await waitForEmailTo('trainer@test.com', {
    subject: /check-in/i,
  });
  expect(email.Subject).toContain('Test Member');
  expect(email.Subject).toContain('check-in');
  expect(email.HTML).toContain('Test Member');
});
```

> Note: "You've already submitted" appears as confirmation both when the member submits now AND when they already submitted earlier. The email check ensures the `sendCheckInReceived` call actually fired during this test run. If the check-in was already submitted in a prior test run of the same day, the form may show the submitted state without re-triggering the email — in that case the `waitForEmailTo` will timeout and fail, which is correct (nothing new was sent).

- [ ] **Step 2: Run to verify**

Run: `pnpm test:e2e -- --grep "can submit the check-in"`
Expected: test passes (Mailpit must be running)

- [ ] **Step 3: Run full suite**

Run: `pnpm test:e2e`
Expected: all 159+ tests pass, no failures

- [ ] **Step 4: Commit**

```bash
git add e2e/member/check-in.spec.ts
git commit -m "feat(e2e): verify check-in received email delivery"
```

---

### Task 10: Push

- [ ] **Step 1: Final lint + build check**

```bash
pnpm lint && pnpm build
```
Expected: no errors

- [ ] **Step 2: Push**

```bash
git push
```
