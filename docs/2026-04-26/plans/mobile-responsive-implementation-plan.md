# Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all POWER_GYM pages usable on mobile (375 px+) across all three roles, with a native bottom-Sheet input for the Member Session Logger.

**Architecture:** Tailwind `sm:` (640 px) breakpoints throughout — `px-4 sm:px-8` replaces every `px-8` page container, fixed-column grids become responsive stacks, and the Session Logger gains a Base UI Sheet that slides up from the bottom on mobile while the existing inline panel stays visible on desktop via `hidden sm:block`. One `useIsMobile()` hook (defined in session-logger.tsx) drives Sheet visibility; all other changes are pure Tailwind class edits.

**Tech Stack:** Next.js App Router, Tailwind CSS, Shadcn UI / Base UI (`@/components/ui/sheet`), React Testing Library, Jest.

---

## File Map

| Task | Files modified |
|------|---------------|
| 1 | `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`, `__tests__/app/member/session-logger.test.tsx` |
| 2 | `src/components/shared/page-header.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`, `src/app/(dashboard)/member/pbs/_components/pb-board.tsx`, `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`, `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx`, `src/app/(dashboard)/member/plan/session/new/page.tsx` |
| 3 | `src/app/(dashboard)/owner/page.tsx`, `src/app/(dashboard)/owner/trainers/page.tsx`, `src/app/(dashboard)/owner/members/page.tsx`, `src/app/(dashboard)/owner/invites/page.tsx`, `src/app/(dashboard)/owner/members/_components/member-list-client.tsx`, `src/app/(dashboard)/owner/_components/trainer-breakdown-table.tsx` |
| 4 | `src/app/(dashboard)/trainer/members/page.tsx`, `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`, `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`, `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx` |
| 5 | `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`, `src/app/(dashboard)/trainer/plans/new/page.tsx`, `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`, `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`, `src/app/(dashboard)/trainer/nutrition/new/_client.tsx`, `src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx` |

---

## Task 1: Session Logger — mobile bottom Sheet

**Files:**
- Modify: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`
- Modify: `__tests__/app/member/session-logger.test.tsx`

### Background

`session-logger.tsx` renders per-exercise cards. When a user clicks a SetChip, `activeSetIndex` is set, and an inline input panel expands inline under that set row. On mobile this is cramped (Weight + Reps + Log Set squeezed into one line). The fix: add a full-width bottom Sheet that opens on mobile when a set is active; keep the inline panel for desktop wrapped in `hidden sm:block`.

A `useIsMobile()` helper (defined in the same file) checks `window.innerWidth < 640` via a `useEffect` and returns `true` in JSDOM (JSDOM's `window.innerWidth` defaults to 0), which means in tests the Sheet is always open when `activeSetIndex !== null`.

- [ ] **Step 1: Write the failing test**

Add this test at the bottom of `__tests__/app/member/session-logger.test.tsx`, inside the existing `describe('SessionLogger', ...)` block:

```tsx
it('renders mobile Sheet with duplicate inputs when set chip is clicked', () => {
  render(<SessionLogger session={mockSession} />);

  // Before clicking: no active set, only the inline panel area exists but no inputs
  const setChips = screen.getAllByRole('button', { name: /set 1/i });
  fireEvent.click(setChips[0]);

  // After clicking: inline panel (hidden sm:block) + Sheet both render weight/reps inputs.
  // In JSDOM window.innerWidth=0 so isMobile=true → Sheet opens → 2 of each.
  expect(screen.getAllByLabelText('Weight (kg)')).toHaveLength(2);
  expect(screen.getAllByLabelText('Reps')).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=session-logger -t "renders mobile Sheet"
```

Expected: FAIL — `Expected: 2, Received: 1` (only the inline panel exists currently).

- [ ] **Step 3: Add `useIsMobile` hook and bottom Sheet to `session-logger.tsx`**

Replace the top of the file through the imports section:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SetChip } from '@/components/shared/set-chip';
import { cn } from '@/lib/utils';
```

Add `useIsMobile` immediately after the imports (before the interfaces):

```tsx
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}
```

Inside `SessionLogger`, add `const isMobile = useIsMobile();` right after the existing `useState` declarations:

```tsx
export function SessionLogger({ session: initialSession }: { session: Session }) {
  const router = useRouter();
  const isMobile = useIsMobile();                          // ADD
  const [session, setSession] = useState(initialSession);
  const [inputs, setInputs] = useState<SetInputState[]>(
    initialSession.sets.map(() => ({ weight: '', reps: '' })),
  );
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  // ... rest unchanged
```

Wrap the existing inline panel `<div>` in `hidden sm:block`. Find this block inside the `.map()` for each exercise card (it's the IIFE that renders the inline panel):

```tsx
{sets.some(({ index }) => activeSetIndex === index) && (() => {
  const activeSet = sets.find(({ index }) => activeSetIndex === index)!;
  return (
    <div className="hidden sm:block mt-3 pt-3 border-t border-[#141414] space-y-2">
      <div className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
        Log Set {activeSet.setNumber}
      </div>
      <div className="flex gap-2">
        {!isBodyweight && (
          <Input
            aria-label="Weight (kg)"
            placeholder="Weight (kg)"
            type="number"
            value={inputs[activeSet.index]?.weight ?? ''}
            onChange={(e) => {
              const next = [...inputs];
              next[activeSet.index] = { ...next[activeSet.index], weight: e.target.value };
              setInputs(next);
            }}
            className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333]"
          />
        )}
        <Input
          aria-label="Reps"
          placeholder="Reps"
          type="number"
          value={inputs[activeSet.index]?.reps ?? ''}
          onChange={(e) => {
            const next = [...inputs];
            next[activeSet.index] = { ...next[activeSet.index], reps: e.target.value };
            setInputs(next);
          }}
          className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333]"
        />
        <Button
          size="sm"
          onClick={() => logSet(activeSet.index)}
          className="h-8 bg-white text-black hover:bg-white/90 text-[11px] font-semibold shrink-0"
        >
          Log Set
        </Button>
      </div>
    </div>
  );
})()}
```

Change `px-8` → `px-4 sm:px-8` in the two existing outer divs:

```tsx
<div className="px-4 sm:px-8 py-3">
  <ProgressBar ... />
</div>

<div className="px-4 sm:px-8 py-4 space-y-4">
  {groupedExercises().map(...)}
</div>
```

Add the mobile Sheet as the **last child** of the outer return `<div>`, after the exercises container:

```tsx
      </div>  {/* closes px-4 sm:px-8 py-4 exercises container */}

      {/* Mobile bottom Sheet — visible only when isMobile && a set is active */}
      <Sheet
        open={isMobile && activeSetIndex !== null}
        onOpenChange={(open) => { if (!open) setActiveSetIndex(null); }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-[#0f0f0f] border-t border-[#1e1e1e] px-5 pb-8 pt-5 rounded-t-xl"
        >
          <SheetTitle className="sr-only">Log Set</SheetTitle>
          {activeSetIndex !== null && (() => {
            const set = session.sets[activeSetIndex];
            return (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#444]">
                    {set.exerciseName}
                  </div>
                  <div className="text-[15px] font-bold text-white mt-0.5">
                    Set {set.setNumber} — {repsLabel(set.prescribedRepsMin, set.prescribedRepsMax)}
                  </div>
                </div>
                <div className="flex gap-3">
                  {!set.isBodyweight && (
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#444]">
                        Weight (kg)
                      </label>
                      <Input
                        aria-label="Weight (kg)"
                        type="number"
                        value={inputs[activeSetIndex]?.weight ?? ''}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[activeSetIndex] = { ...next[activeSetIndex], weight: e.target.value };
                          setInputs(next);
                        }}
                        className="h-12 text-[16px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a]"
                        placeholder="e.g. 60"
                      />
                    </div>
                  )}
                  <div className={cn(!set.isBodyweight ? 'w-28' : 'flex-1', 'space-y-1.5')}>
                    <label className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#444]">
                      Reps
                    </label>
                    <Input
                      aria-label="Reps"
                      type="number"
                      value={inputs[activeSetIndex]?.reps ?? ''}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[activeSetIndex] = { ...next[activeSetIndex], reps: e.target.value };
                        setInputs(next);
                      }}
                      className="h-12 text-[16px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a]"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => logSet(activeSetIndex)}
                  className="w-full h-12 bg-white text-black hover:bg-white/90 text-[13px] font-bold"
                >
                  Log Set
                </Button>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Run the new test — it should pass**

```bash
pnpm test -- --testPathPattern=session-logger -t "renders mobile Sheet"
```

Expected: PASS.

- [ ] **Step 5: Fix existing tests broken by duplicate inputs**

In `__tests__/app/member/session-logger.test.tsx`, update the two tests that interact with the log form inputs. Find `getByRole('spinbutton', ...)` and `getByRole('button', { name: /log set/i })` calls and switch to `getAllByRole(...)[0]`:

```tsx
it('calls PATCH API when set logged via log form', async () => {
  const user = userEvent.setup();
  render(<SessionLogger session={mockSession} />);

  const setChips = screen.getAllByRole('button', { name: /set 1/i });
  fireEvent.click(setChips[0]);

  // [0] = inline panel input (first in DOM); [1] = Sheet input
  const weightInput = screen.getAllByRole('spinbutton', { name: /weight/i })[0];
  const repsInput = screen.getAllByRole('spinbutton', { name: /reps/i })[0];

  await user.type(weightInput, '80');
  await user.type(repsInput, '10');

  const logButton = screen.getAllByRole('button', { name: /log set/i })[0];
  fireEvent.click(logButton);

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/sessions/s1/sets/0',
      expect.objectContaining({ method: 'PATCH' }),
    ),
  );
});

it('calls toast.success when a set is logged successfully', async () => {
  const updatedSession = {
    ...mockSession,
    sets: [
      { ...mockSession.sets[0], completedAt: new Date().toISOString(), actualReps: 10, actualWeight: 60 },
      mockSession.sets[1],
    ],
  };
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => updatedSession,
  });
  render(<SessionLogger session={mockSession} />);

  const setChips = screen.getAllByRole('button', { name: /set 1/i });
  fireEvent.click(setChips[0]);

  fireEvent.change(screen.getAllByRole('spinbutton', { name: /reps/i })[0], { target: { value: '10' } });
  fireEvent.click(screen.getAllByRole('button', { name: /log set/i })[0]);

  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Set logged'));
});

it('calls toast.error with server message when logSet fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Session not found' }),
  });
  render(<SessionLogger session={mockSession} />);

  const setChips = screen.getAllByRole('button', { name: /set 1/i });
  fireEvent.click(setChips[0]);

  fireEvent.change(screen.getAllByRole('spinbutton', { name: /reps/i })[0], { target: { value: '10' } });
  fireEvent.click(screen.getAllByRole('button', { name: /log set/i })[0]);

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Session not found'));
});
```

- [ ] **Step 6: Run all session logger tests**

```bash
pnpm test -- --testPathPattern=session-logger
```

Expected: All tests PASS.

- [ ] **Step 7: Run full test suite**

```bash
pnpm test
```

Expected: All tests PASS. Fix any regressions before continuing.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/member/plan/session/\[id\]/_components/session-logger.tsx \
        __tests__/app/member/session-logger.test.tsx
git commit -m "feat: add mobile bottom Sheet for session set logging"
```

---

## Task 2: PageHeader + auth pages + Member read-only pages

**Files:**
- Modify: `src/components/shared/page-header.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`
- Modify: `src/app/(dashboard)/member/pbs/_components/pb-board.tsx`
- Modify: `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`
- Modify: `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx`
- Modify: `src/app/(dashboard)/member/plan/session/new/page.tsx`

These are all pure Tailwind class changes. No logic changes → no new unit tests needed. Run existing tests after to verify no regressions.

- [ ] **Step 1: `page-header.tsx` — responsive padding**

In `src/components/shared/page-header.tsx`, change the sticky bar className:

```tsx
// BEFORE
<div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0f0f0f] bg-[#050505] px-8 py-5">

// AFTER
<div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0f0f0f] bg-[#050505] px-4 py-4 sm:px-8 sm:py-5">
```

- [ ] **Step 2: `login/page.tsx` — add horizontal padding to outer wrapper**

In `src/app/(auth)/login/page.tsx`, change:

```tsx
// BEFORE
<main className="flex min-h-screen items-center justify-center bg-[#030303]">
  <div className="w-full max-w-sm space-y-8">

// AFTER
<main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
  <div className="w-full max-w-sm space-y-8">
```

- [ ] **Step 3: `register/page.tsx` — same fix**

In `src/app/(auth)/register/page.tsx`:

```tsx
// BEFORE
<main className="flex min-h-screen items-center justify-center bg-[#030303]">
  <div className="w-full max-w-sm space-y-8">

// AFTER
<main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
  <div className="w-full max-w-sm space-y-8">
```

- [ ] **Step 4: `plan-overview.tsx` — responsive padding**

In `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`, change both `px-8` occurrences:

```tsx
// Empty state div
<div className="px-4 sm:px-8 py-28">

// Main content div
<div className="px-4 sm:px-8 py-7 space-y-6">
```

- [ ] **Step 5: `pb-board.tsx` — responsive padding**

In `src/app/(dashboard)/member/pbs/_components/pb-board.tsx`:

```tsx
// Empty state
<div className="px-4 sm:px-8 py-28">

// Main content
<div className="px-4 sm:px-8 py-7">
```

- [ ] **Step 6: `nutrition-plan-viewer.tsx` — responsive padding**

In `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`:

```tsx
// Empty state
<div className="px-4 sm:px-8 py-28">

// Main content
<div className="px-4 sm:px-8 py-7">
```

- [ ] **Step 7: `body-test-viewer.tsx` — responsive padding**

In `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx`:

```tsx
// Empty state
<div className="px-4 sm:px-8 py-28">

// Main content
<div className="px-4 sm:px-8 py-7 space-y-7">
```

- [ ] **Step 8: `session/new/page.tsx` — responsive padding**

In `src/app/(dashboard)/member/plan/session/new/page.tsx`:

```tsx
<div className="px-4 sm:px-8 py-7">
```

- [ ] **Step 9: Run tests**

```bash
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/shared/page-header.tsx \
        src/app/\(auth\)/login/page.tsx \
        src/app/\(auth\)/register/page.tsx \
        src/app/\(dashboard\)/member/plan/_components/plan-overview.tsx \
        src/app/\(dashboard\)/member/pbs/_components/pb-board.tsx \
        src/app/\(dashboard\)/member/nutrition/_components/nutrition-plan-viewer.tsx \
        src/app/\(dashboard\)/member/body-tests/_components/body-test-viewer.tsx \
        src/app/\(dashboard\)/member/plan/session/new/page.tsx
git commit -m "feat: responsive padding for PageHeader, auth, and member pages"
```

---

## Task 3: Owner pages — padding + responsive grid → flex

**Files:**
- Modify: `src/app/(dashboard)/owner/page.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/page.tsx`
- Modify: `src/app/(dashboard)/owner/members/page.tsx`
- Modify: `src/app/(dashboard)/owner/invites/page.tsx`
- Modify: `src/app/(dashboard)/owner/members/_components/member-list-client.tsx`
- Modify: `src/app/(dashboard)/owner/_components/trainer-breakdown-table.tsx`

- [ ] **Step 1: Owner page files — responsive padding**

In `src/app/(dashboard)/owner/page.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7 space-y-8">
```

In `src/app/(dashboard)/owner/trainers/page.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

In `src/app/(dashboard)/owner/members/page.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

In `src/app/(dashboard)/owner/invites/page.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7 space-y-10">
```

- [ ] **Step 2: `member-list-client.tsx` — replace grid with responsive flex**

Replace the entire Card contents of `src/app/(dashboard)/owner/members/_components/member-list-client.tsx`. The column header row is hidden on mobile; data rows use `flex justify-between`:

```tsx
return (
  <>
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
      {/* Column header — desktop only */}
      <div className="hidden sm:grid grid-cols-[1fr_180px_80px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a]">
        <div>Member</div>
        <div>Trainer</div>
        <div></div>
      </div>

      {members.map((member) => (
        <div
          key={member._id}
          className="flex items-start justify-between gap-3 border-b border-[#0f0f0f] px-5 py-3.5 last:border-0 hover:bg-[#0e0e0e] transition-colors sm:grid sm:grid-cols-[1fr_180px_80px] sm:items-center"
        >
          <div>
            <div className="text-[13px] font-medium text-[#bbb]">{member.name}</div>
            <div className="text-[10px] text-[#2e2e2e] mt-0.5">{member.email}</div>
            {/* Trainer name visible inline on mobile */}
            <div className="text-[10px] text-[#3a3a3a] mt-1 sm:hidden">
              {member.trainerName ?? '—'}
            </div>
          </div>
          {/* Trainer name column — desktop only */}
          <div className="hidden sm:block text-[11px] text-[#3a3a3a]">
            {member.trainerName ?? '—'}
          </div>
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReassigning(member)}
              className="text-[#333] hover:text-[#888] hover:bg-[#141414] text-xs"
            >
              Reassign
            </Button>
          </div>
        </div>
      ))}
    </Card>

    {reassigning && (
      <ReassignModal
        memberId={reassigning._id}
        memberName={reassigning.name}
        currentTrainerId={reassigning.trainerId}
        trainers={trainers}
        onClose={() => setReassigning(null)}
      />
    )}
  </>
);
```

- [ ] **Step 3: `trainer-breakdown-table.tsx` — replace grid with responsive flex**

Replace the Card contents in `src/app/(dashboard)/owner/_components/trainer-breakdown-table.tsx`:

```tsx
return (
  <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
    {/* Column header — desktop only */}
    <div className="hidden sm:grid grid-cols-[1fr_100px_120px_80px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a]">
      <div>Trainer</div>
      <div>Members</div>
      <div>Sessions / mo</div>
      <div></div>
    </div>

    {trainers.map((trainer) => (
      <div
        key={trainer._id}
        className="flex items-start justify-between gap-3 border-b border-[#0f0f0f] px-5 py-3.5 last:border-0 hover:bg-[#0e0e0e] transition-colors sm:grid sm:grid-cols-[1fr_100px_120px_80px] sm:items-center"
      >
        <div>
          <div className="text-[13px] font-medium text-[#ccc]">{trainer.name}</div>
          <div className="text-[10px] text-[#2e2e2e] mt-0.5">{trainer.email}</div>
          {/* Stats inline on mobile */}
          <div className="flex gap-4 mt-1.5 sm:hidden">
            <span className="text-[11px] font-semibold text-[#666]">
              {trainer.memberCount}
              <span className="text-[9px] font-normal text-[#2e2e2e] ml-0.5">members</span>
            </span>
            <span className="text-[11px] font-semibold text-[#666]">
              {trainer.sessionsThisMonth}
              <span className="text-[9px] font-normal text-[#2e2e2e] ml-0.5">sessions/mo</span>
            </span>
          </div>
        </div>
        {/* Members column — desktop only */}
        <div className="hidden sm:block text-[13px] font-semibold text-[#888]">
          {trainer.memberCount}
          <span className="text-[10px] font-medium text-[#2e2e2e] ml-1">members</span>
        </div>
        {/* Sessions column — desktop only */}
        <div className="hidden sm:block text-[13px] font-semibold text-[#888]">
          {trainer.sessionsThisMonth}
        </div>
        <div>
          <Link
            href="/owner/trainers"
            className="text-[10px] text-[#333] hover:text-[#666] transition-colors whitespace-nowrap"
          >
            Manage →
          </Link>
        </div>
      </div>
    ))}
  </Card>
);
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/owner/page.tsx \
        src/app/\(dashboard\)/owner/trainers/page.tsx \
        src/app/\(dashboard\)/owner/members/page.tsx \
        src/app/\(dashboard\)/owner/invites/page.tsx \
        src/app/\(dashboard\)/owner/members/_components/member-list-client.tsx \
        src/app/\(dashboard\)/owner/_components/trainer-breakdown-table.tsx
git commit -m "feat: responsive layout for owner pages"
```

---

## Task 4: Trainer per-member pages + body test grid fix

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/page.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`

- [ ] **Step 1: `trainer/members/page.tsx` — responsive padding + flex-col card layout**

In `src/app/(dashboard)/trainer/members/page.tsx`, make two changes:

1. Outer container padding:
```tsx
<div className="px-4 sm:px-8 py-7">
```

2. Each member Card changes from `flex items-center justify-between` to a column layout on mobile:
```tsx
<Card
  key={member._id.toString()}
  className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-[#2a2a2a] transition-colors"
>
  <div>
    <div className="text-[14px] font-semibold text-white">{member.name}</div>
    <div className="text-[12px] text-[#555] mt-0.5">{member.email}</div>
  </div>
  <div className="flex items-center gap-4 pt-3 border-t border-[#141414] sm:pt-0 sm:border-0">
    <Link
      href={`/trainer/members/${member._id}/plan`}
      className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
    >
      Plan →
    </Link>
    <Link
      href={`/trainer/members/${member._id}/body-tests`}
      className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
    >
      Body Tests →
    </Link>
    <Link
      href={`/trainer/members/${member._id}/nutrition`}
      className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
    >
      Nutrition →
    </Link>
  </div>
</Card>
```

- [ ] **Step 2: `trainer-member-plan-client.tsx` — responsive padding**

In `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`, change all four `section className="px-8"` occurrences to `"px-4 sm:px-8"`:

```tsx
// Line ~58
<section className="px-4 sm:px-8">
// Line ~77
<section className="px-4 sm:px-8">
// Line ~101
<section className="px-4 sm:px-8">
// Line ~129
<section className="px-4 sm:px-8">
```

- [ ] **Step 3: `trainer-member-nutrition-client.tsx` — responsive padding**

In `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`, change both `section className="px-8"` to `"px-4 sm:px-8"`:

```tsx
<section className="px-4 sm:px-8">  // line ~63
<section className="px-4 sm:px-8">  // line ~82
```

- [ ] **Step 4: `body-test-client.tsx` — padding + Age/Sex/Weight grid fix**

In `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`:

Change both `section className="px-8"` → `"px-4 sm:px-8"`:
```tsx
<section className="px-4 sm:px-8">  // line ~135 (New Body Test)
<section className="px-4 sm:px-8">  // line ~326 (History)
```

Change the Age/Sex/Weight grid from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`:
```tsx
// BEFORE
<div className="grid grid-cols-3 gap-4">

// AFTER
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
```

(The skinfold sites grid `grid-cols-3` stays unchanged — short number inputs fit at 375 px.)

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/page.tsx \
        "src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx" \
        "src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx" \
        "src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx"
git commit -m "feat: responsive layout for trainer per-member pages"
```

---

## Task 5: Trainer template pages

**Files:**
- Modify: `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/new/_client.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx`

All changes in this task are `px-8` → `px-4 sm:px-8`. No layout restructuring needed (form components already use `max-w-2xl` and stack vertically; nutrition macro grid is already `grid-cols-2 sm:grid-cols-4`).

- [ ] **Step 1: Apply responsive padding to all six files**

`src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

`src/app/(dashboard)/trainer/plans/new/page.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

`src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx` (two occurrences — the loading state and the main wrapper):
```tsx
if (!template) return <p className="px-4 sm:px-8 py-7 text-[#444] text-sm">加载中...</p>;
// ...
<div className="px-4 sm:px-8 py-7">
```

`src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

`src/app/(dashboard)/trainer/nutrition/new/_client.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

`src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx`:
```tsx
<div className="px-4 sm:px-8 py-7">
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 3: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: All 29 tests PASS. These run on desktop viewport so no E2E changes are needed.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/trainer/plans/_components/plan-template-list.tsx \
        src/app/\(dashboard\)/trainer/plans/new/page.tsx \
        "src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx" \
        src/app/\(dashboard\)/trainer/nutrition/_components/nutrition-template-list.tsx \
        src/app/\(dashboard\)/trainer/nutrition/new/_client.tsx \
        "src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx"
git commit -m "feat: responsive padding for trainer template pages"
```

---

## Final verification

After all 5 tasks are committed:

```bash
pnpm lint
pnpm build
```

Both must succeed with zero errors or warnings. Fix any TypeScript or lint issues before marking complete.

Manual smoke test at 375 px (iPhone SE) viewport in browser DevTools:
- [ ] Login page — card doesn't overflow
- [ ] Member Plan — days grid stacks to single column, Start Session button full width
- [ ] Session Logger — tap Set chip → Sheet slides up from bottom, full-width inputs
- [ ] Member PBs — list rows readable, no horizontal overflow
- [ ] Owner Dashboard — stat cards 2×2, trainer breakdown stacks vertically
- [ ] Owner Members — each row shows name/email/trainer stacked, Reassign right-aligned
- [ ] Trainer Members list — links move to second line with border separator
- [ ] Trainer Plans/new — form fills screen with 16 px side padding
- [ ] Body Test form — Age/Sex/Weight inputs stack vertically on mobile
