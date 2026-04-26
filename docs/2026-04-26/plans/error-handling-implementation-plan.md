# Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add layered error handling — route-level error boundaries, global error pages, and Sonner toast notifications for all async mutations — so no page ever crashes silently and every failed action gives visible user feedback.

**Architecture:** Three layers: (1) Next.js `error.tsx` / `not-found.tsx` / `global-error.tsx` for unhandled server-side crashes; (2) `toast.error()` / `toast.success()` from Sonner for all client-side fetch mutations; (3) HTML `required` validation already handles form field errors. The `<Toaster>` is mounted once in the root layout; client components call `toast` from `sonner` directly. The Sonner component is already installed — it just needs to be mounted and called.

**Tech Stack:** Next.js App Router error boundaries, Sonner (already installed at `src/components/ui/sonner.tsx`), React Testing Library + Jest.

---

### Task 1: Mount Toaster and create error boundary pages

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/(dashboard)/error.tsx`

No unit tests for Next.js framework files — verify by running `pnpm build`.

- [ ] **Step 1: Mount `<Toaster>` in root layout**

Replace the full content of `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'POWER GYM',
  description: 'Professional gym management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
```

Note: passing `theme="dark"` directly bypasses the `useTheme` call in `sonner.tsx` via the `{...props}` spread, which avoids requiring a ThemeProvider.

- [ ] **Step 2: Create `src/app/global-error.tsx`**

```tsx
'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="text-center space-y-4">
          <h1 className="text-[20px] font-semibold text-white">Something went wrong</h1>
          <p className="text-[13px] text-[#444]">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="mt-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `src/app/not-found.tsx`**

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <div className="text-center space-y-4">
        <h1 className="text-[20px] font-semibold text-white">Page not found</h1>
        <p className="text-[13px] text-[#444]">
          This page doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(dashboard)/error.tsx`**

```tsx
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h2 className="text-[18px] font-semibold text-white">Something went wrong</h2>
      <p className="text-[13px] text-[#444] max-w-sm text-center">
        {error.message || 'An unexpected error occurred on this page.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/global-error.tsx src/app/not-found.tsx "src/app/(dashboard)/error.tsx"
git commit -m "feat: mount Toaster and add global error boundary pages"
```

---

### Task 2: Toast in plan and nutrition assignment components

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Create: `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberPlanClient } from '@/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockProps = {
  memberId: 'm1',
  memberName: 'Test Member',
  templates: [{ _id: 't1', name: 'Test Plan' }],
  activePlan: null,
  sessions: [],
  pbs: [],
};

describe('TrainerMemberPlanClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when plan is assigned successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<TrainerMemberPlanClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan assigned'));
  });

  it('calls toast.error with server message when assignment fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Plan not found' }),
    });
    render(<TrainerMemberPlanClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plan not found'));
  });

  it('calls toast.error with fallback when server returns no message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<TrainerMemberPlanClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to assign plan'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="trainer-member-plan-client" --no-coverage
```

Expected: FAIL — `toast.success` and `toast.error` not called.

- [ ] **Step 3: Update `trainer-member-plan-client.tsx`**

Add `import { toast } from 'sonner';` at the top with the other imports.

Replace the `assignPlan` function (currently lines ~30-41):

```ts
async function assignPlan() {
  if (!selectedTemplate) return;
  setAssigning(true);
  try {
    const res = await fetch(`/api/members/${memberId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selectedTemplate }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to assign plan');
      return;
    }
    toast.success('Plan assigned');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setAssigning(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="trainer-member-plan-client" --no-coverage
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Update `trainer-member-nutrition-client.tsx`**

Add `import { toast } from 'sonner';` at the top with the other imports.

Replace the `assignPlan` function (currently ~lines 35-47):

```ts
async function assignPlan() {
  if (!selectedTemplate) return;
  setAssigning(true);
  try {
    const res = await fetch(`/api/members/${memberId}/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selectedTemplate }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to assign plan');
      return;
    }
    toast.success('Nutrition plan assigned');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setAssigning(false);
  }
}
```

- [ ] **Step 6: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing (306+ tests).

- [ ] **Step 7: Commit**

```bash
git add "__tests__/app/trainer/members/trainer-member-plan-client.test.tsx" \
  "src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx" \
  "src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx"
git commit -m "feat: add toast feedback to plan and nutrition assignment"
```

---

### Task 3: Toast in invite components

**Files:**
- Modify: `src/app/(dashboard)/owner/invites/_components/invite-create-form.tsx`
- Modify: `src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx`
- Create: `__tests__/app/owner/invites/invite-create-form.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/owner/invites/invite-create-form.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteCreateForm } from '@/app/(dashboard)/owner/invites/_components/invite-create-form';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe('InviteCreateForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when invite is created successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ inviteUrl: 'http://localhost:3000/register?token=abc' }),
    });
    render(<InviteCreateForm trainers={[{ _id: 't1', name: 'Trainer A' }]} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invite link generated'),
    );
  });

  it('calls toast.error with server message when invite creation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already invited' }),
    });
    render(<InviteCreateForm trainers={[{ _id: 't1', name: 'Trainer A' }]} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Email already invited'),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="invite-create-form" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `invite-create-form.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace the `handleSubmit` function (currently lines ~30-42):

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  const body: Record<string, string> = { role, recipientEmail: email };
  if (role === 'member' && trainerId) body.trainerId = trainerId;

  try {
    const res = await fetch('/api/owner/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to create invite');
      return;
    }
    const data = (await res.json()) as { inviteUrl: string };
    setGeneratedUrl(data.inviteUrl);
    toast.success('Invite link generated');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setSaving(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="invite-create-form" --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Update `invite-list-client.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleRevoke` (currently lines ~26-30):

```ts
async function handleRevoke(id: string) {
  if (!confirm('Revoke this invite? The link will no longer work.')) return;
  try {
    const res = await fetch(`/api/owner/invites/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to revoke invite');
      return;
    }
    toast.success('Invite revoked');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  }
}
```

Replace `handleResend` (currently lines ~32-36):

```ts
async function handleResend(id: string) {
  try {
    const res = await fetch(`/api/owner/invites/${id}/resend`, { method: 'POST' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to resend invite');
      return;
    }
    const data = (await res.json()) as { inviteUrl: string };
    await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
    toast.success('Link copied to clipboard');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  }
}
```

- [ ] **Step 6: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing.

- [ ] **Step 7: Commit**

```bash
git add "__tests__/app/owner/invites/invite-create-form.test.tsx" \
  "src/app/(dashboard)/owner/invites/_components/invite-create-form.tsx" \
  "src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx"
git commit -m "feat: add toast feedback to invite creation and management"
```

---

### Task 4: Toast in owner management components

**Files:**
- Modify: `src/app/(dashboard)/owner/members/_components/reassign-modal.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx`
- Create: `__tests__/app/owner/members/reassign-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/owner/members/reassign-modal.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const defaultProps = {
  memberId: 'm1',
  memberName: 'Test Member',
  currentTrainerId: 't1',
  trainers: [
    { _id: 't1', name: 'Trainer A' },
    { _id: 't2', name: 'Trainer B' },
  ],
  onClose: jest.fn(),
};

describe('ReassignModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success on successful reassign', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Member reassigned'),
    );
  });

  it('calls toast.error with server message when reassign fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Member not found' }),
    });
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Member not found'),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="reassign-modal" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `reassign-modal.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleConfirm` (currently lines ~28-35):

```ts
async function handleConfirm() {
  setSaving(true);
  try {
    const res = await fetch(`/api/owner/members/${memberId}/trainer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainerId: selectedTrainerId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to reassign member');
      return;
    }
    toast.success('Member reassigned');
    onClose();
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setSaving(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="reassign-modal" --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Update `trainer-list-client.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleRemove` (currently lines ~33-45):

```ts
async function handleRemove(trainerId: string) {
  const reassignToId = allTrainers.find((t) => t._id !== trainerId)?._id ?? '';
  const memberCount = trainers.find((t) => t._id === trainerId)?.memberCount ?? 0;
  const confirmed = confirm(
    `Remove this trainer? Their ${memberCount} members will be reassigned.`,
  );
  if (!confirmed) return;

  setRemoving(trainerId);
  try {
    const res = await fetch(`/api/owner/trainers/${trainerId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reassignToId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to remove trainer');
      return;
    }
    toast.success('Trainer removed');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  } finally {
    setRemoving(null);
  }
}
```

- [ ] **Step 6: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing.

- [ ] **Step 7: Commit**

```bash
git add "__tests__/app/owner/members/reassign-modal.test.tsx" \
  "src/app/(dashboard)/owner/members/_components/reassign-modal.tsx" \
  "src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx"
git commit -m "feat: add toast feedback to owner member and trainer management"
```

---

### Task 5: Toast in SessionLogger

**Files:**
- Modify: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`
- Create: `__tests__/app/member/session-logger.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/member/session-logger.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const baseSet = {
  exerciseId: 'e1',
  exerciseName: 'Bench Press',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 8,
  prescribedRepsMax: 12,
  isExtraSet: false,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
};

const mockSession = {
  _id: 's1',
  memberId: 'm1',
  dayName: 'Push Day',
  completedAt: null,
  sets: [baseSet],
};

describe('SessionLogger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when a set is logged successfully', async () => {
    const updatedSession = {
      ...mockSession,
      sets: [{ ...baseSet, completedAt: new Date().toISOString(), actualReps: 10, actualWeight: 60 }],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedSession,
    });
    render(<SessionLogger session={mockSession} />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.change(screen.getByPlaceholderText(/reps/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /log set/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Set logged'));
  });

  it('calls toast.error with server message when logSet fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Session not found' }),
    });
    render(<SessionLogger session={mockSession} />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.change(screen.getByPlaceholderText(/reps/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /log set/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Session not found'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="session-logger" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `session-logger.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `logSet` (currently lines ~70-86):

```ts
async function logSet(setIndex: number) {
  const input = inputs[setIndex];
  const set = session.sets[setIndex];
  try {
    const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualWeight: set.isBodyweight ? null : parseFloat(input.weight) || null,
        actualReps: parseInt(input.reps, 10) || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to log set');
      return;
    }
    const updated = (await res.json()) as Session;
    setSession(updated);
    setActiveSetIndex(null);
    toast.success('Set logged');
  } catch {
    toast.error('Something went wrong');
  }
}
```

Also replace `addSet` (currently lines ~88-106):

```ts
async function addSet(exerciseId: string) {
  const exercise = session.sets.find((s) => s.exerciseId === exerciseId);
  if (!exercise) return;
  try {
    const res = await fetch(`/api/sessions/${session._id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        prescribedRepsMin: exercise.prescribedRepsMin,
        prescribedRepsMax: exercise.prescribedRepsMax,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to add set');
      return;
    }
    const updated = (await res.json()) as Session;
    setSession(updated);
    setInputs((prev) => [...prev, { weight: '', reps: '' }]);
  } catch {
    toast.error('Something went wrong');
  }
}
```

Replace `completeSession` (currently lines ~107-119):

```ts
async function completeSession() {
  setCompleting(true);
  try {
    const res = await fetch(`/api/sessions/${session._id}/complete`, { method: 'POST' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to complete session');
      setCompleting(false);
      return;
    }
    toast.success('Session complete!');
    router.push('/member/plan');
  } catch {
    toast.error('Something went wrong');
    setCompleting(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="session-logger" --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing.

- [ ] **Step 6: Commit**

```bash
git add "__tests__/app/member/session-logger.test.tsx" \
  "src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx"
git commit -m "feat: add toast feedback to session set logging"
```

---

### Task 6: Toast in BodyTestClient

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`
- Create: `__tests__/app/trainer/members/body-test-client.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/trainer/members/body-test-client.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BodyTestClient, type BodyTestRecord } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockRecord: BodyTestRecord = {
  _id: 'bt1',
  date: new Date().toISOString(),
  protocol: 'other',
  weight: 75,
  bodyFatPct: 18,
  leanMassKg: 61.5,
  fatMassKg: 13.5,
  targetWeight: null,
  targetBodyFatPct: null,
};

describe('BodyTestClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when body test is saved successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRecord,
    });
    render(
      <BodyTestClient memberId="m1" memberName="Test Member" initialTests={[]} />,
    );
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/body fat/i), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Body test saved'));
  });

  it('calls toast.error with server message when save fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid measurements' }),
    });
    render(
      <BodyTestClient memberId="m1" memberName="Test Member" initialTests={[]} />,
    );
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/body fat/i), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid measurements'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="body-test-client" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `body-test-client.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

In `handleSubmit`, after the `try {` block, replace the final `if (res.ok) { ... }` block (currently inside the existing try):

```ts
if (!res.ok) {
  const data = (await res.json()) as { error?: string };
  toast.error(data.error ?? 'Failed to save body test');
  return;
}
const created = (await res.json()) as BodyTestRecord;
setTests((prev) => [created, ...prev]);
toast.success('Body test saved');
router.refresh();
```

Also update `handleDelete`:

```ts
async function handleDelete(testId: string) {
  try {
    const res = await fetch(`/api/members/${memberId}/body-tests/${testId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? 'Failed to delete test');
      return;
    }
    setTests((prev) => prev.filter((t) => t._id !== testId));
    toast.success('Body test deleted');
    router.refresh();
  } catch {
    toast.error('Something went wrong');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="body-test-client" --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing.

- [ ] **Step 6: Commit**

```bash
git add "__tests__/app/trainer/members/body-test-client.test.tsx" \
  "src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx"
git commit -m "feat: add toast feedback to body test save and delete"
```

---

### Task 7: Toast in plan and nutrition template save pages

**Files:**
- Modify: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/new/_client.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx`
- Create: `__tests__/app/trainer/plans/new-plan-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/trainer/plans/new-plan-page.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPlanPage from '@/app/(dashboard)/trainer/plans/new/page';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('NewPlanPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when plan is saved successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ _id: 'p1' }) });
    render(<NewPlanPage />);
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan saved'));
  });

  it('calls toast.error with server message when save fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Plan name already exists' }),
    });
    render(<NewPlanPage />);
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plan name already exists'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="new-plan-page" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `trainer/plans/new/page.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleSubmit`:

```ts
async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
  const res = await fetch('/api/plan-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    toast.error(body.error ?? 'Failed to save plan');
    return;
  }
  toast.success('Plan saved');
  router.push('/trainer/plans');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="new-plan-page" --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Update `trainer/plans/[id]/edit/page.tsx`**

Read the current `handleSubmit` in this file. It follows the same pattern as `new/page.tsx`. Add `import { toast } from 'sonner';` and update `handleSubmit`:

```ts
async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
  const res = await fetch(`/api/plan-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    toast.error(body.error ?? 'Failed to save plan');
    return;
  }
  toast.success('Plan saved');
  router.push('/trainer/plans');
}
```

- [ ] **Step 6: Update `trainer/nutrition/new/_client.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleSubmit`:

```ts
async function handleSubmit(data: {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}) {
  const res = await fetch('/api/nutrition-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    toast.error(body.error ?? 'Failed to save nutrition plan');
    return;
  }
  toast.success('Nutrition plan saved');
  router.push('/trainer/nutrition');
}
```

- [ ] **Step 7: Update `trainer/nutrition/[id]/edit/_client.tsx`**

Add `import { toast } from 'sonner';` with the other imports.

Replace `handleSubmit`:

```ts
async function handleSubmit(data: {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}) {
  const res = await fetch(`/api/nutrition-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    toast.error(body.error ?? 'Failed to save nutrition plan');
    return;
  }
  toast.success('Nutrition plan saved');
  router.push('/trainer/nutrition');
}
```

- [ ] **Step 8: Run all tests**

```bash
pnpm test --no-coverage
```

Expected: All passing.

- [ ] **Step 9: Commit**

```bash
git add "__tests__/app/trainer/plans/new-plan-page.test.tsx" \
  "src/app/(dashboard)/trainer/plans/new/page.tsx" \
  "src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx" \
  "src/app/(dashboard)/trainer/nutrition/new/_client.tsx" \
  "src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx"
git commit -m "feat: add toast feedback to plan and nutrition template save"
```
