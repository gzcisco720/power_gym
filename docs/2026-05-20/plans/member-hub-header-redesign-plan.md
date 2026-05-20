# Member Hub Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the member hub sticky header to fix hardcoded colors, make the avatar visible, add role-aware back links, and expose a cross-tab "Log Workout" CTA.

**Architecture:** Single-file change — `layout.tsx` gets a third data fetch (`hasActivePlan`), a restructured three-row JSX (breadcrumb / identity+CTA / tab bar), and all hardcoded hex colors replaced with theme tokens. No new files, no new abstractions.

**Tech Stack:** Next.js App Router (Server Component), Tailwind CSS tokens, `IMemberPlanRepository.findActive()` (already exists)

---

## Files

| Action | File |
|---|---|
| Modify | `src/app/(dashboard)/trainer/members/[id]/layout.tsx` |
| Modify | `__tests__/app/trainer/member-hub-layout.test.ts` |

---

## Task 1: Extend tests — mock plan repo, add new assertions

**Files:**
- Modify: `__tests__/app/trainer/member-hub-layout.test.ts`

The existing test file mocks `MongoUserRepository`. We need to add a `MongoMemberPlanRepository` mock alongside it, then add four new test cases covering the new behavior. Existing tests are **not** changed — they will start failing only because the layout now calls the plan repo and we haven't implemented it yet.

- [ ] **Step 1: Add plan repository mock to the top of the test file**

Open `__tests__/app/trainer/member-hub-layout.test.ts`. Replace the block that currently ends at `jest.mock('next/navigation', ...)` with:

```ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));

// redirect() in Next.js throws at runtime — mirror that so code after redirect() stops
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
```

- [ ] **Step 2: Update `beforeEach` to also clear plan repo mock**

The existing `beforeEach` already calls `jest.clearAllMocks()`, which clears all mocks including `mockPlanRepo`. No change needed here — but verify the `beforeEach` block still reads:

```ts
beforeEach(() => {
  jest.clearAllMocks();
});
```

- [ ] **Step 3: Update existing render tests to set a plan repo default**

The existing "renders for trainer" and "renders for owner" tests now need `mockPlanRepo.findActive` to resolve, otherwise the layout will throw. Add a `mockPlanRepo.findActive.mockResolvedValue(null)` line at the start of each of those two tests.

"renders for trainer when member belongs to them":
```ts
it('renders for trainer when member belongs to them', async () => {
  mockPlanRepo.findActive.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date(),
    trainerId: { toString: () => 't1' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  expect(result).not.toBeNull();
});
```

"renders for owner regardless of trainerId":
```ts
it('renders for owner regardless of trainerId', async () => {
  mockPlanRepo.findActive.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date(),
    trainerId: { toString: () => 't99' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  expect(result).not.toBeNull();
});
```

- [ ] **Step 4: Add four new test cases at the end of the `describe` block**

```ts
it('renders Log Workout link when member has an active plan', async () => {
  mockPlanRepo.findActive.mockResolvedValue({ _id: 'plan1', isActive: true });
  mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date('2026-01-01'),
    trainerId: { toString: () => 't1' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  const html = JSON.stringify(result);
  expect(html).toContain('Log Workout');
});

it('does not render Log Workout link when member has no active plan', async () => {
  mockPlanRepo.findActive.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date('2026-01-01'),
    trainerId: { toString: () => 't1' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  const html = JSON.stringify(result);
  expect(html).not.toContain('Log Workout');
});

it('renders trainer back link for trainer role', async () => {
  mockPlanRepo.findActive.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date('2026-01-01'),
    trainerId: { toString: () => 't1' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  const html = JSON.stringify(result);
  expect(html).toContain('/trainer/members');
  expect(html).toContain('Members');
});

it('renders owner back link for owner role', async () => {
  mockPlanRepo.findActive.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
  mockUserRepo.findById.mockResolvedValue({
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date('2026-01-01'),
    trainerId: { toString: () => 't99' },
  });
  const { default: Layout } = await import(
    '@/app/(dashboard)/trainer/members/[id]/layout'
  );
  const result = await Layout({ children: null, ...makeParams('m1') });
  const html = JSON.stringify(result);
  expect(html).toContain('/owner/members');
  expect(html).toContain('All Members');
});
```

- [ ] **Step 5: Run the test file — confirm existing tests fail with "not a function" or similar (plan repo not yet imported in layout)**

```bash
pnpm test -- --testPathPattern=member-hub-layout --no-coverage
```

Expected: 4 new tests FAIL (plan repo not in layout yet), 5 existing tests may still PASS or FAIL depending on whether layout crashes on missing mock. Either outcome is fine — the point is we have a failing baseline.

---

## Task 2: Implement layout changes

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/layout.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberTabNav } from '@/components/shared/member-tab-nav';
import type { UserRole } from '@/types/auth';

interface MemberHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

function formatJoinDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default async function MemberHubLayout({ children, params }: MemberHubLayoutProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId } = await params;

  await connectDB();
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) redirect('/trainer/members');

  const role = session.user.role as UserRole;
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    redirect('/trainer/members');
  }

  const hasActivePlan = !!(await new MongoMemberPlanRepository().findActive(memberId));

  const initials = member.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const backHref = role === 'owner' ? '/owner/members' : '/trainer/members';
  const backLabel = role === 'owner' ? '← All Members' : '← Members';
  const planHref = `/trainer/members/${memberId}/plan`;

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background">

        {/* Breadcrumb row */}
        <div className="px-4 pt-3 sm:px-8">
          <Link
            href={backHref}
            className="text-[11px] text-foreground/30 hover:text-foreground/55 transition-colors flex items-center gap-1 w-fit"
          >
            {backLabel}
          </Link>
        </div>

        {/* Identity + CTA row */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 ring-4 ring-primary/6 text-[15px] font-bold text-primary-light">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-foreground leading-tight">
                {member.name}
              </div>
              <div className="text-[11px] text-foreground/40 mt-0.5">
                {member.email}
                <span className="mx-1.5 text-foreground/15">·</span>
                Joined {formatJoinDate(member.createdAt)}
              </div>
            </div>
          </div>

          {hasActivePlan && (
            <Link
              href={planHref}
              className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Log Workout
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <MemberTabNav memberId={memberId} />
      </div>

      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Run the tests — all 9 should pass**

```bash
pnpm test -- --testPathPattern=member-hub-layout --no-coverage
```

Expected output:
```
 PASS  __tests__/app/trainer/member-hub-layout.test.ts
  MemberHubLayout
    ✓ redirects to login when unauthenticated
    ✓ redirects trainer when member belongs to another trainer
    ✓ redirects when member not found
    ✓ renders for trainer when member belongs to them
    ✓ renders for owner regardless of trainerId
    ✓ renders Log Workout link when member has an active plan
    ✓ does not render Log Workout link when member has no active plan
    ✓ renders trainer back link for trainer role
    ✓ renders owner back link for owner role

Tests: 9 passed, 9 total
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no errors, no warnings.

- [ ] **Step 4: Visual check in browser**

The dev server is already running on `http://localhost:3000`. Navigate to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5165` (logged in as trainer) and verify:

1. Top-left shows a small `← Members` link
2. Avatar is 48px, indigo-tinted, initials clearly visible
3. Sub-info reads `member@dev.com · Joined [date]` (not "Member for N days")
4. Right side shows `Log Workout` button (member has an active plan in dev data)
5. Clicking `Log Workout` lands on the Plan tab
6. No hardcoded `#` hex values visible in DevTools computed styles on the header

Then navigate as owner (`owner@dev.com`) to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5166` and verify:

7. Top-left shows `← All Members`
8. `Log Workout` appears (member2 has an active plan)
9. Sidebar correctly shows "OWNER PORTAL"

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/layout.tsx \
        __tests__/app/trainer/member-hub-layout.test.ts
git commit -m "refactor(member-hub): redesign header — tokens, avatar, breadcrumb, Log Workout CTA"
```

---

## Self-Review

**Spec coverage:**
- ✅ No hardcoded hex → all replaced with tokens in Task 2 Step 1
- ✅ Avatar visible → h-12 w-12, bg-primary/15, ring-4 ring-primary/6, text-primary-light
- ✅ Trainer back link → `← Members` → `/trainer/members` in breadcrumb row
- ✅ Owner back link → `← All Members` → `/owner/members` in breadcrumb row
- ✅ Log Workout appears with active plan → Task 1 Step 4 test + Task 2 conditional render
- ✅ Log Workout hidden without active plan → Task 1 Step 4 test + Task 2 conditional render
- ✅ Log Workout navigates to Plan tab → `href={planHref}` points to `/trainer/members/:id/plan`
- ✅ Sub-info → `Joined [date]` replacing "Member for N days"
- ✅ lint passes → Task 2 Step 3
- ✅ E2E not broken → layout is structural only, no flow change

**Placeholder scan:** None found.

**Type consistency:** `formatJoinDate(date: Date)` defined in Task 2 Step 1 and called in the same step. `hasActivePlan` is a boolean from `!!findActive()`. `backHref`, `backLabel`, `planHref` are all strings used immediately in JSX. No cross-task type dependencies.
