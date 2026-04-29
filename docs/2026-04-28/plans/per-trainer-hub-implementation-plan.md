# Per-Trainer Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner can view a dedicated hub page for each trainer at `/owner/trainers/[id]` showing Overview (3 stat cards), Members (list + View + Reassign), and Calendar (read-only week grid) tabs.

**Architecture:** Three nested routes under a shared layout that fetches the trainer profile. New `TrainerTabNav` client component mirrors the existing `MemberTabNav`. `CalendarClient` gains `readOnly` and `filterTrainerId` props; the schedule GET API gains an optional `?trainerId=` param for owner filtering.

**Tech Stack:** Next.js App Router (server components + client components), MongoDB via repository pattern, Playwright E2E, Jest unit tests

---

## File Map

| Status | Path | Purpose |
|--------|------|---------|
| Create | `src/components/shared/trainer-tab-nav.tsx` | Tab nav (Overview / Members / Calendar) |
| Create | `src/app/(dashboard)/owner/trainers/[id]/layout.tsx` | Auth, trainer fetch, profile header |
| Create | `src/app/(dashboard)/owner/trainers/[id]/page.tsx` | Overview — 3 stat cards |
| Create | `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx` | Members tab server component |
| Create | `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx` | Members list client (View + Reassign) |
| Create | `src/app/(dashboard)/owner/trainers/[id]/calendar/page.tsx` | Calendar tab server component |
| Modify | `src/lib/repositories/plan-template.repository.ts` | Add `countByCreator()` |
| Modify | `src/components/calendar/calendar-client.tsx` | Add `readOnly` + `filterTrainerId` props |
| Modify | `src/app/api/schedule/route.ts` | Owner GET: support `?trainerId=` param |
| Modify | `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx` | Add "View →" link per trainer row |
| Modify | `__tests__/lib/repositories/plan-template.repository.test.ts` | Add `countByCreator` tests |
| Modify | `e2e/owner/trainers.spec.ts` | Add hub E2E tests |

---

## Task 1: `countByCreator` repo method

**Files:**
- Modify: `src/lib/repositories/plan-template.repository.ts`
- Test: `__tests__/lib/repositories/plan-template.repository.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the mock setup — add `countDocuments: jest.fn()` to the mock object, then add a new describe block:

```typescript
// At top of file, add countDocuments to the mock:
jest.mock('@/lib/db/models/plan-template.model', () => ({
  PlanTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

// New describe block:
describe('countByCreator', () => {
  it('returns count for given createdBy id', async () => {
    mockModel.countDocuments.mockResolvedValue(3 as never);
    const id = new mongoose.Types.ObjectId().toString();
    const result = await repo.countByCreator(id);
    expect(mockModel.countDocuments).toHaveBeenCalledWith({
      createdBy: expect.any(mongoose.Types.ObjectId),
    });
    expect(result).toBe(3);
  });

  it('returns 0 when none exist', async () => {
    mockModel.countDocuments.mockResolvedValue(0 as never);
    const result = await repo.countByCreator(new mongoose.Types.ObjectId().toString());
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=plan-template.repository
```

Expected: FAIL — `countByCreator is not a function`

- [ ] **Step 3: Add interface method and implementation**

In `src/lib/repositories/plan-template.repository.ts`:

```typescript
// Add to interface:
export interface IPlanTemplateRepository {
  findByCreator(createdBy: string): Promise<IPlanTemplate[]>;
  findById(id: string): Promise<IPlanTemplate | null>;
  create(data: CreatePlanTemplateData): Promise<IPlanTemplate>;
  update(id: string, data: UpdatePlanTemplateData): Promise<IPlanTemplate | null>;
  deleteById(id: string, createdBy: string): Promise<boolean>;
  countByCreator(createdBy: string): Promise<number>;
}

// Add to class:
async countByCreator(createdBy: string): Promise<number> {
  return PlanTemplateModel.countDocuments({
    createdBy: new mongoose.Types.ObjectId(createdBy),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=plan-template.repository
```

Expected: PASS (all tests including new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/plan-template.repository.ts __tests__/lib/repositories/plan-template.repository.test.ts
git commit -m "feat(repo): add countByCreator to PlanTemplateRepository"
```

---

## Task 2: TrainerTabNav component

**Files:**
- Create: `src/components/shared/trainer-tab-nav.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/components/shared/trainer-tab-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Members',  segment: '/members' },
  { label: 'Calendar', segment: '/calendar' },
] as const;

interface TrainerTabNavProps {
  trainerId: string;
}

export function TrainerTabNav({ trainerId }: TrainerTabNavProps) {
  const pathname = usePathname();
  const base = `/owner/trainers/${trainerId}`;

  return (
    <div className="flex gap-0 border-b border-[#141414] px-4 sm:px-8">
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`;
        const isActive = tab.segment === '' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'px-4 py-3 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-white border-white'
                : 'text-[#555] border-transparent hover:text-[#888]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run lint and type-check**

```bash
pnpm lint && pnpm build --dry-run 2>/dev/null || pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/trainer-tab-nav.tsx
git commit -m "feat: add TrainerTabNav component"
```

---

## Task 3: Hub layout + "View →" entry point

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/layout.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx`

- [ ] **Step 1: Create the layout**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { TrainerTabNav } from '@/components/shared/trainer-tab-nav';

interface TrainerHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TrainerHubLayout({ children, params }: TrainerHubLayoutProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const trainer = await new MongoUserRepository().findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') redirect('/owner/trainers');

  const initials = trainer.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysSinceJoined = Math.floor(
    (Date.now() - trainer.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[#0f0f0f] bg-[#050505]">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[13px] font-semibold text-[#666]">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">{trainer.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5">
                {trainer.email}
                <span className="mx-1.5 text-[#333]">·</span>
                已加入 {daysSinceJoined} 天
              </div>
            </div>
          </div>
          <a
            href="/owner/trainers"
            className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
          >
            ← All Trainers
          </a>
        </div>
        <TrainerTabNav trainerId={trainerId} />
      </div>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Add "View →" link to trainer-list-client.tsx**

In `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx`, add `import Link from 'next/link';` at the top, then add a View link in the buttons row:

```typescript
// Add import at top (after existing imports):
import Link from 'next/link';

// In the buttons div (after the Members button, before Remove button):
<Link
  href={`/owner/trainers/${trainer._id}`}
  className="inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 text-[#777] hover:text-[#aaa] hover:bg-[#141414] transition-colors"
>
  View →
</Link>
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/owner/trainers/[id]/layout.tsx src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx
git commit -m "feat: add trainer hub layout and View → entry point"
```

---

## Task 4: Overview page

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/page.tsx`

- [ ] **Step 1: Create the overview page**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { StatCard } from '@/components/shared/stat-card';

export default async function TrainerHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planTemplateRepo = new MongoPlanTemplateRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [sessionsThisMonth, templateCount] = await Promise.all([
    memberIds.length > 0
      ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
      : Promise.resolve(0),
    planTemplateRepo.countByCreator(trainerId),
  ]);

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="会员数" value={String(members.length)} />
        <StatCard label="本月训练" value={String(sessionsThisMonth)} unit="次" />
        <StatCard label="训练模板" value={String(templateCount)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint + type-check**

```bash
pnpm lint && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/owner/trainers/[id]/page.tsx
git commit -m "feat: add trainer hub overview page with stat cards"
```

---

## Task 5: Members tab

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx`
- Create: `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx`

- [ ] **Step 1: Create the client component**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
}

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  members: MemberRow[];
  trainers: TrainerOption[];
  currentTrainerId: string;
}

export function TrainerHubMembersClient({ members, trainers, currentTrainerId }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#777]">No members assigned.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {members.map((member) => (
          <div
            key={member._id}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-[#0f0f0f] last:border-0"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#141414] text-[9px] font-semibold text-[#888]">
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#ccc]">{member.name}</div>
              <div className="text-[10px] text-[#555]">{member.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/trainer/members/${member._id}`}
                className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
              >
                View →
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReassigning(member)}
                className="text-[#777] hover:text-[#aaa] hover:bg-[#141414] text-xs"
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
          currentTrainerId={currentTrainerId}
          trainers={trainers}
          onClose={() => setReassigning(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the server page**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/members/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { TrainerHubMembersClient } from './_components/trainer-hub-members-client';

export default async function TrainerHubMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const userRepo = new MongoUserRepository();

  const [members, allTrainers] = await Promise.all([
    userRepo.findAllMembers(trainerId),
    userRepo.findByRole('trainer'),
  ]);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
    trainerId: m.trainerId?.toString() ?? null,
  }));

  const trainerDtos = allTrainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  return (
    <div className="px-4 sm:px-8 py-7">
      <TrainerHubMembersClient
        members={memberDtos}
        trainers={trainerDtos}
        currentTrainerId={trainerId}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run lint + type-check**

```bash
pnpm lint && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/owner/trainers/[id]/members/
git commit -m "feat: add trainer hub members tab with View and Reassign"
```

---

## Task 6: CalendarClient readOnly + filterTrainerId props

**Files:**
- Modify: `src/components/calendar/calendar-client.tsx`

- [ ] **Step 1: Add the two new optional props**

Update `CalendarClientProps` and the component body in `src/components/calendar/calendar-client.tsx`:

```typescript
// Updated interface:
interface CalendarClientProps {
  currentUserRole: 'owner' | 'trainer';
  currentUserId: string;
  trainers: Trainer[];
  members: Member[];
  readOnly?: boolean;
  filterTrainerId?: string;
}

// Updated function signature:
export function CalendarClient({
  currentUserRole,
  currentUserId,
  trainers,
  members,
  readOnly = false,
  filterTrainerId,
}: CalendarClientProps) {
```

- [ ] **Step 2: Apply filterTrainerId to the fetch URL**

In the `useEffect` load function, update the fetch call:

```typescript
// Replace:
const res = await fetch(`/api/schedule?start=${startIso}&end=${endIso}`);

// With:
const url = filterTrainerId
  ? `/api/schedule?start=${startIso}&end=${endIso}&trainerId=${filterTrainerId}`
  : `/api/schedule?start=${startIso}&end=${endIso}`;
const res = await fetch(url);
```

Also add `filterTrainerId` to the useEffect dependency array comment:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [weekStart, refreshTick, filterTrainerId]);
```

- [ ] **Step 3: Apply readOnly to slot and session clicks**

```typescript
// Replace the WeekCalendarGrid props:
<WeekCalendarGrid
  weekStart={weekStart}
  sessions={sessions}
  memberMap={memberMap}
  trainerColorMap={{}}
  onSlotClick={readOnly ? () => {} : (date, time) =>
    setCreateSlot({ date: date.toISOString().slice(0, 10), time })
  }
  onSessionClick={readOnly ? () => {} : (s) => setEditSession(s)}
/>

// Replace the modals section (wrap in !readOnly guard):
{!readOnly && createSlot && (
  <CreateSessionModal
    open
    defaultDate={createSlot.date}
    defaultStartTime={createSlot.time}
    trainers={trainers}
    members={members}
    currentUserRole={currentUserRole}
    currentUserId={currentUserId}
    onSuccess={handleSuccess}
    onClose={() => setCreateSlot(null)}
  />
)}

{!readOnly && editSession && (
  <EditSessionModal
    open
    session={editSession}
    memberMap={memberMap}
    onSuccess={handleSuccess}
    onClose={() => setEditSession(null)}
  />
)}
```

- [ ] **Step 4: Run lint + type-check**

```bash
pnpm lint && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/calendar-client.tsx
git commit -m "feat(calendar): add readOnly and filterTrainerId props to CalendarClient"
```

---

## Task 7: Schedule API trainerId filter for owner

**Files:**
- Modify: `src/app/api/schedule/route.ts`

- [ ] **Step 1: Update the owner branch of the GET handler**

In `src/app/api/schedule/route.ts`, find the GET handler's owner branch (currently `docs = await repo.findByDateRange(start, end, {})`) and update it:

```typescript
// Replace the owner branch:
} else {
  // Owner: optionally filter to a specific trainer's sessions
  const trainerIdParam = url.searchParams.get('trainerId');
  docs = await repo.findByDateRange(
    start,
    end,
    trainerIdParam ? { trainerId: trainerIdParam } : {},
  );
}
```

- [ ] **Step 2: Run lint + type-check**

```bash
pnpm lint && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/schedule/route.ts
git commit -m "feat(api): owner GET /api/schedule supports ?trainerId= filter"
```

---

## Task 8: Calendar tab page

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/calendar/page.tsx`

- [ ] **Step 1: Create the calendar page**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/calendar/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function TrainerHubCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const members = await userRepo.findAllMembers(trainerId);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: m.trainerId?.toString() ?? '',
  }));

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <CalendarClient
        currentUserRole="owner"
        currentUserId={session.user.id ?? ''}
        trainers={[]}
        members={memberDtos}
        readOnly
        filterTrainerId={trainerId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run lint + type-check**

```bash
pnpm lint && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/owner/trainers/[id]/calendar/page.tsx
git commit -m "feat: add trainer hub calendar tab (read-only week view)"
```

---

## Task 9: E2E tests

**Files:**
- Modify: `e2e/owner/trainers.spec.ts`

- [ ] **Step 1: Replace with comprehensive hub tests**

```typescript
// e2e/owner/trainers.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Trainers', () => {
  test('trainer list shows trainer email', async ({ page }) => {
    await page.goto('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('expand Members shows member@test.com', async ({ page }) => {
    await page.goto('/owner/trainers');
    const trainerRow = page.getByText('trainer@test.com', { exact: true }).locator('..').locator('..');
    await trainerRow.getByRole('button', { name: /members/i }).click();
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('View → link navigates to trainer hub', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub shows back link to all trainers', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByRole('link', { name: '← All Trainers' })).toBeVisible();
  });

  test('back link returns to trainer list', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.getByRole('link', { name: '← All Trainers' }).click();
    await page.waitForURL('/owner/trainers');
    await expect(page.getByText('trainer@test.com', { exact: true })).toBeVisible();
  });

  test('overview shows 3 stat cards', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await expect(page.getByText('会员数')).toBeVisible();
    await expect(page.getByText('本月训练')).toBeVisible();
    await expect(page.getByText('训练模板')).toBeVisible();
  });

  test('members tab shows member with View and Reassign', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.getByRole('link', { name: 'Members', exact: true }).click();
    await page.waitForURL(/\/owner\/trainers\/.+\/members$/);
    await expect(page.getByText('Test Member')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View →' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reassign/i }).first()).toBeVisible();
  });

  test('calendar tab renders week grid with navigation', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.getByRole('link', { name: 'View →' }).first().click();
    await page.waitForURL(/\/owner\/trainers\/.+$/);
    await page.getByRole('link', { name: 'Calendar', exact: true }).click();
    await page.waitForURL(/\/owner\/trainers\/.+\/calendar$/);
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
pnpm test:e2e -- --grep "Owner: Trainers"
```

Expected: All tests pass

- [ ] **Step 3: Run full E2E suite**

```bash
pnpm test:e2e
```

Expected: All tests pass (no regressions)

- [ ] **Step 4: Commit**

```bash
git add e2e/owner/trainers.spec.ts
git commit -m "test(e2e): add trainer hub E2E tests"
```

---

## Final check

- [ ] Run `pnpm test` — all unit tests pass
- [ ] Run `pnpm test:e2e` — all E2E tests pass
- [ ] Run `pnpm lint` — no warnings or errors
- [ ] Run `pnpm tsc --noEmit` — no type errors
