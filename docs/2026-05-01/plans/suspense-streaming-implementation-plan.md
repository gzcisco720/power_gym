# React Suspense Streaming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Suspense streaming to all pages with `Promise.all` data fetches so page shells render immediately and content streams in progressively.

**Architecture:** Extract data-fetching logic from each page into dedicated async Server Components, wrap each with `<Suspense fallback={<Skeleton />}>` in the thinned page. Multi-section pages (Member Hub, Owner Dashboard) get independent Suspense boundaries per section; single-section pages get one coarse boundary. All skeletons use Shadcn's `<Skeleton />` and mirror the real layout.

**Tech Stack:** Next.js App Router (React Server Components), React Suspense, Shadcn `<Skeleton />`, TypeScript strict mode, Jest + pnpm.

---

### Task 1: Shared StatCardsSkeleton component

**Files:**
- Create: `src/components/shared/stat-cards-skeleton.tsx`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/components/shared/shared-components.test.tsx`:

```typescript
describe('StatCardsSkeleton', () => {
  it('renders the given number of skeleton cards', () => {
    const { container } = render(
      <StatCardsSkeleton count={5} />
    );
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(5);
  });
});
```

Also add the import at the top of the file alongside the existing imports:

```typescript
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/components/shared/shared-components"
```

Expected: FAIL — `Cannot find module '@/components/shared/stat-cards-skeleton'`

- [ ] **Step 3: Create the component**

```typescript
// src/components/shared/stat-cards-skeleton.tsx
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCardsSkeleton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-xl" />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="__tests__/components/shared/shared-components"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/stat-cards-skeleton.tsx __tests__/components/shared/shared-components.test.tsx
git commit -m "feat: add shared StatCardsSkeleton component"
```

---

### Task 2: Member Hub — StatCardsSection

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section.tsx`
- Modify: `__tests__/app/trainer/member-hub-page.test.ts`

- [ ] **Step 1: Update the unit test (RED — add StatCardsSection describe block)**

Replace the contents of `__tests__/app/trainer/member-hub-page.test.ts` with:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findLatestByMember: jest.fn() };
const mockSessionRepo = { findMemberStats: jest.fn() };
const mockPlanRepo = { findActive: jest.fn() };
const mockInjuryRepo = { findActiveByMember: jest.fn() };

jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));
jest.mock('@/lib/repositories/member-injury.repository', () => ({
  MongoMemberInjuryRepository: jest.fn(() => mockInjuryRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('MemberHubOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.findLatestByMember.mockResolvedValue(null);
    mockSessionRepo.findMemberStats.mockResolvedValue({
      completedCount: 0,
      lastCompletedAt: null,
    });
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
  });

  it('renders non-null JSX when authenticated', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });
});

describe('StatCardsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBodyTestRepo.findLatestByMember.mockResolvedValue(null);
    mockSessionRepo.findMemberStats.mockResolvedValue({
      completedCount: 0,
      lastCompletedAt: null,
    });
    mockPlanRepo.findActive.mockResolvedValue(null);
  });

  it('fetches body test, stats and plan in parallel', async () => {
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    await StatCardsSection({ memberId: 'm1' });
    expect(mockBodyTestRepo.findLatestByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('renders without throwing when all data is null', async () => {
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    const result = await StatCardsSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });

  it('renders without throwing when body test data is available', async () => {
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({
      weight: 73,
      bodyFatPct: 18.2,
    });
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    const result = await StatCardsSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/member-hub-page"
```

Expected: FAIL — `StatCardsSection` tests fail with `Cannot find module`.

- [ ] **Step 3: Create StatCardsSection**

```typescript
// src/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function StatCardsSection({ memberId }: { memberId: string }) {
  await connectDB();
  const [latestTest, stats, activePlan] = await Promise.all([
    new MongoBodyTestRepository().findLatestByMember(memberId),
    new MongoWorkoutSessionRepository().findMemberStats(memberId),
    new MongoMemberPlanRepository().findActive(memberId),
  ]);

  const lastTrainedLabel = stats.lastCompletedAt
    ? formatRelativeDate(stats.lastCompletedAt)
    : '—';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="当前体重"
        value={latestTest ? String(latestTest.weight) : '—'}
        unit={latestTest ? 'kg' : undefined}
      />
      <StatCard
        label="体脂率"
        value={latestTest ? String(latestTest.bodyFatPct) : '—'}
        unit={latestTest ? '%' : undefined}
      />
      <StatCard label="累计训练" value={String(stats.completedCount)} unit="次" />
      <StatCard label="上次训练" value={lastTrainedLabel} />
      <StatCard label="当前计划" value={activePlan ? activePlan.name : '无计划'} />
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/member-hub-page"
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/_components/stat-cards-section.tsx \
        __tests__/app/trainer/member-hub-page.test.ts
git commit -m "feat: extract StatCardsSection from member hub overview"
```

---

### Task 3: Member Hub — HealthSection + skeletons + thin page

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/_components/health-section.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/_components/health-section-skeleton.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/page.tsx`
- Modify: `__tests__/app/trainer/member-hub-page.test.ts`

- [ ] **Step 1: Add HealthSection test (RED)**

Append to `__tests__/app/trainer/member-hub-page.test.ts`:

```typescript
describe('HealthSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
  });

  it('fetches active injuries for the member', async () => {
    const { HealthSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-section'
    );
    await HealthSection({ memberId: 'm1' });
    expect(mockInjuryRepo.findActiveByMember).toHaveBeenCalledWith('m1');
  });

  it('renders without throwing when no injuries', async () => {
    const { HealthSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-section'
    );
    const result = await HealthSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/member-hub-page"
```

Expected: FAIL — HealthSection tests fail with `Cannot find module`.

- [ ] **Step 3: Create HealthSection**

```typescript
// src/app/(dashboard)/trainer/members/[id]/_components/health-section.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { Card } from '@/components/ui/card';

export async function HealthSection({ memberId }: { memberId: string }) {
  await connectDB();
  const activeInjuries = await new MongoMemberInjuryRepository().findActiveByMember(memberId);

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
        Health
      </h2>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {activeInjuries.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-[#555]">No active injuries</p>
        ) : (
          activeInjuries.map((injury) => (
            <div
              key={(injury._id as { toString(): string }).toString()}
              className="px-5 py-3.5 border-b border-[#0f0f0f] last:border-0"
            >
              <p className="text-[13px] font-medium text-white">{injury.title}</p>
              {injury.affectedMovements && (
                <p className="text-[11px] text-[#666] mt-0.5">
                  {injury.affectedMovements}
                </p>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create HealthSectionSkeleton**

```typescript
// src/app/(dashboard)/trainer/members/[id]/_components/health-section-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function HealthSectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-[80px] rounded-xl" />
    </div>
  );
}
```

- [ ] **Step 5: Thin the page**

Replace `src/app/(dashboard)/trainer/members/[id]/page.tsx` with:

```typescript
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { StatCardsSection } from './_components/stat-cards-section';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { HealthSection } from './_components/health-section';
import { HealthSectionSkeleton } from './_components/health-section-skeleton';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7 space-y-6">
      <Suspense fallback={<StatCardsSkeleton count={5} className="sm:grid-cols-3 lg:grid-cols-5" />}>
        <StatCardsSection memberId={memberId} />
      </Suspense>
      <Suspense fallback={<HealthSectionSkeleton />}>
        <HealthSection memberId={memberId} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/member-hub-page"
```

Expected: PASS (7 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/_components/health-section.tsx \
        src/app/\(dashboard\)/trainer/members/\[id\]/_components/health-section-skeleton.tsx \
        src/app/\(dashboard\)/trainer/members/\[id\]/page.tsx \
        __tests__/app/trainer/member-hub-page.test.ts
git commit -m "feat: add Suspense streaming to member hub overview page"
```

---

### Task 4: Owner Dashboard — DashboardStats + DashboardStatsSkeleton

**Files:**
- Create: `src/app/(dashboard)/owner/_components/dashboard-stats.tsx`
- Create: `src/app/(dashboard)/owner/_components/dashboard-stats-skeleton.tsx`
- Create: `__tests__/app/owner/dashboard-stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/owner/dashboard-stats.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = {
  findByRole: jest.fn(),
  findAllMembers: jest.fn(),
};
const mockInviteRepo = { findAll: jest.fn() };
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

describe('DashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findByRole.mockResolvedValue([]);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockInviteRepo.findAll.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
  });

  it('fetches trainers, members and invites in parallel', async () => {
    const { DashboardStats } = await import(
      '@/app/(dashboard)/owner/_components/dashboard-stats'
    );
    await DashboardStats();
    expect(mockUserRepo.findByRole).toHaveBeenCalledWith('trainer');
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith();
    expect(mockInviteRepo.findAll).toHaveBeenCalledWith();
  });

  it('renders without throwing', async () => {
    const { DashboardStats } = await import(
      '@/app/(dashboard)/owner/_components/dashboard-stats'
    );
    const result = await DashboardStats();
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/dashboard-stats"
```

Expected: FAIL — `Cannot find module '@/app/(dashboard)/owner/_components/dashboard-stats'`

- [ ] **Step 3: Create DashboardStats**

```typescript
// src/app/(dashboard)/owner/_components/dashboard-stats.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function DashboardStats() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const inviteRepo = new MongoInviteRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const [trainers, members, invites] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
    inviteRepo.findAll(),
  ]);

  const now = new Date();
  const pendingInviteCount = invites.filter(
    (inv) => inv.usedAt === null && inv.expiresAt > now,
  ).length;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const memberIds = members.map((m) => m._id.toString());
  const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(
    memberIds,
    startOfMonth,
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Trainers" value={String(trainers.length)} />
      <StatCard label="Members" value={String(members.length)} />
      <StatCard label="Sessions / mo" value={String(sessionsThisMonth)} />
      <StatCard label="Pending Invites" value={String(pendingInviteCount)} />
    </div>
  );
}
```

- [ ] **Step 4: Create DashboardStatsSkeleton**

```typescript
// src/app/(dashboard)/owner/_components/dashboard-stats-skeleton.tsx
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';

export function DashboardStatsSkeleton() {
  return <StatCardsSkeleton count={4} className="sm:grid-cols-4" />;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/dashboard-stats"
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/owner/_components/dashboard-stats.tsx \
        src/app/\(dashboard\)/owner/_components/dashboard-stats-skeleton.tsx \
        __tests__/app/owner/dashboard-stats.test.ts
git commit -m "feat: extract DashboardStats section component"
```

---

### Task 5: Owner Dashboard — TrainerBreakdownSection + skeleton + thin page

**Files:**
- Create: `src/app/(dashboard)/owner/_components/trainer-breakdown-section.tsx`
- Create: `src/app/(dashboard)/owner/_components/trainer-breakdown-skeleton.tsx`
- Modify: `src/app/(dashboard)/owner/page.tsx`
- Modify: `__tests__/app/owner/dashboard-stats.test.ts`

- [ ] **Step 1: Add TrainerBreakdownSection test (RED)**

Append to `__tests__/app/owner/dashboard-stats.test.ts`:

```typescript
describe('TrainerBreakdownSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findByRole.mockResolvedValue([]);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
  });

  it('fetches trainers and all members', async () => {
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    await TrainerBreakdownSection();
    expect(mockUserRepo.findByRole).toHaveBeenCalledWith('trainer');
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith();
  });

  it('renders without throwing when no trainers', async () => {
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    const result = await TrainerBreakdownSection();
    expect(result).not.toBeNull();
  });

  it('queries session count for each trainer', async () => {
    mockUserRepo.findByRole.mockResolvedValue([
      { _id: { toString: () => 't1' }, name: 'Trainer 1', email: 't1@test.com' },
    ]);
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' }, trainerId: { toString: () => 't1' } },
    ]);
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    await TrainerBreakdownSection();
    expect(mockSessionRepo.countByMemberIdsSince).toHaveBeenCalledWith(
      ['m1'],
      expect.any(Date),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/dashboard-stats"
```

Expected: FAIL — TrainerBreakdownSection tests fail with `Cannot find module`.

- [ ] **Step 3: Create TrainerBreakdownSection**

```typescript
// src/app/(dashboard)/owner/_components/trainer-breakdown-section.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { TrainerBreakdownTable } from './trainer-breakdown-table';

export async function TrainerBreakdownSection() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const [trainers, members] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const membersByTrainer = new Map<string, (typeof members)[0][]>();
  for (const member of members) {
    const tid = member.trainerId?.toString() ?? '__none__';
    const arr = membersByTrainer.get(tid) ?? [];
    arr.push(member);
    membersByTrainer.set(tid, arr);
  }

  const trainerRows = await Promise.all(
    trainers.map(async (trainer) => {
      const trainerMembers = membersByTrainer.get(trainer._id.toString()) ?? [];
      const trainerMemberIds = trainerMembers.map((m) => m._id.toString());
      const trainerSessions = await sessionRepo.countByMemberIdsSince(
        trainerMemberIds,
        startOfMonth,
      );
      return {
        _id: trainer._id.toString(),
        name: trainer.name,
        email: trainer.email,
        memberCount: trainerMembers.length,
        sessionsThisMonth: trainerSessions,
      };
    }),
  );

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3.5">
        Trainer Breakdown
      </h2>
      <TrainerBreakdownTable trainers={trainerRows} />
    </div>
  );
}
```

- [ ] **Step 4: Create TrainerBreakdownSkeleton**

```typescript
// src/app/(dashboard)/owner/_components/trainer-breakdown-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function TrainerBreakdownSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 rounded-lg" />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Thin the owner dashboard page**

Replace `src/app/(dashboard)/owner/page.tsx` with:

```typescript
import Link from 'next/link';
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from './_components/dashboard-stats';
import { DashboardStatsSkeleton } from './_components/dashboard-stats-skeleton';
import { TrainerBreakdownSection } from './_components/trainer-breakdown-section';
import { TrainerBreakdownSkeleton } from './_components/trainer-breakdown-skeleton';

export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Gym overview"
        actions={
          <Link
            href="/owner/invites"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
          >
            + Invite Trainer
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-7 space-y-8">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>
        <Suspense fallback={<TrainerBreakdownSkeleton />}>
          <TrainerBreakdownSection />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/dashboard-stats"
```

Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/owner/_components/trainer-breakdown-section.tsx \
        src/app/\(dashboard\)/owner/_components/trainer-breakdown-skeleton.tsx \
        src/app/\(dashboard\)/owner/page.tsx \
        __tests__/app/owner/dashboard-stats.test.ts
git commit -m "feat: add Suspense streaming to owner dashboard page"
```

---

### Task 6: Member Progress — ProgressContent + ProgressSkeleton + thin page

**Files:**
- Create: `src/app/(dashboard)/member/progress/_components/progress-content.tsx`
- Create: `src/app/(dashboard)/member/progress/_components/progress-skeleton.tsx`
- Modify: `src/app/(dashboard)/member/progress/page.tsx`
- Modify: `__tests__/app/member/progress-page.test.ts`

- [ ] **Step 1: Update the unit test (RED)**

Replace `__tests__/app/member/progress-page.test.ts` with:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = {
  findCompletedDates: jest.fn(),
  findTrainedExercises: jest.fn(),
};

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('MemberProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findCompletedDates.mockResolvedValue([]);
    mockRepo.findTrainedExercises.mockResolvedValue([]);
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import('@/app/(dashboard)/member/progress/page');
    const result = await Page();
    expect(result).toBeNull();
  });

  it('renders non-null JSX when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { default: Page } = await import('@/app/(dashboard)/member/progress/page');
    const result = await Page();
    expect(result).not.toBeNull();
  });
});

describe('ProgressContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findCompletedDates.mockResolvedValue([]);
    mockRepo.findTrainedExercises.mockResolvedValue([]);
  });

  it('calls findCompletedDates and findTrainedExercises for the member', async () => {
    const { ProgressContent } = await import(
      '@/app/(dashboard)/member/progress/_components/progress-content'
    );
    await ProgressContent({ memberId: 'm1' });
    expect(mockRepo.findCompletedDates).toHaveBeenCalledWith('m1', expect.any(Date));
    expect(mockRepo.findTrainedExercises).toHaveBeenCalledWith('m1');
  });

  it('uses a since date approximately 90 days in the past', async () => {
    const now = Date.now();
    const { ProgressContent } = await import(
      '@/app/(dashboard)/member/progress/_components/progress-content'
    );
    await ProgressContent({ memberId: 'm1' });
    const since = mockRepo.findCompletedDates.mock.calls[0][1] as Date;
    const diffDays = Math.round((now - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/member/progress-page"
```

Expected: FAIL — `ProgressContent` tests fail with `Cannot find module`.

- [ ] **Step 3: Create ProgressContent**

```typescript
// src/app/(dashboard)/member/progress/_components/progress-content.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { ProgressClient } from './progress-client';

interface Props {
  memberId: string;
  title?: string;
}

export async function ProgressContent({ memberId, title }: Props) {
  await connectDB();
  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [completedDates, exercises] = await Promise.all([
    repo.findCompletedDates(memberId, since),
    repo.findTrainedExercises(memberId),
  ]);

  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return (
    <ProgressClient
      heatmapData={heatmapData}
      exercises={exercises}
      memberId={memberId}
      title={title}
    />
  );
}
```

- [ ] **Step 4: Create ProgressSkeleton**

```typescript
// src/app/(dashboard)/member/progress/_components/progress-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function ProgressSkeleton() {
  return (
    <div className="space-y-6 px-4 sm:px-8 py-7">
      <Skeleton className="h-[120px] rounded-xl" />
      <Skeleton className="h-[200px] rounded-xl" />
    </div>
  );
}
```

- [ ] **Step 5: Thin the member progress page**

Replace `src/app/(dashboard)/member/progress/page.tsx` with:

```typescript
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { ProgressContent } from './_components/progress-content';
import { ProgressSkeleton } from './_components/progress-skeleton';

export default async function MemberProgressPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent memberId={session.user.id} />
    </Suspense>
  );
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/member/progress-page"
```

Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/member/progress/_components/progress-content.tsx \
        src/app/\(dashboard\)/member/progress/_components/progress-skeleton.tsx \
        src/app/\(dashboard\)/member/progress/page.tsx \
        __tests__/app/member/progress-page.test.ts
git commit -m "feat: add Suspense streaming to member progress page"
```

---

### Task 7: Trainer Member Progress — thin page

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/progress/page.tsx`
- Modify: `__tests__/app/trainer/progress-page.test.ts`

Note: `ProgressContent` and `ProgressSkeleton` were created in Task 6 — this task only thins the page and updates the test.

- [ ] **Step 1: Update the unit test (RED)**

Replace `__tests__/app/trainer/progress-page.test.ts` with:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockWorkoutRepo = {
  findCompletedDates: jest.fn(),
  findTrainedExercises: jest.fn(),
};

const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockWorkoutRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('TrainerMemberProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkoutRepo.findCompletedDates.mockResolvedValue([]);
    mockWorkoutRepo.findTrainedExercises.mockResolvedValue([]);
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/progress/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('returns null when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/progress/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('returns null when member belongs to a different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Test Member',
      trainerId: { toString: () => 't2' },
    });
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/progress/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });

  it('allows owner to view any member progress', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Test Member',
      trainerId: { toString: () => 't1' },
    });
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/progress/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('renders non-null JSX when trainer is authorized', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Test Member',
      trainerId: { toString: () => 't1' },
    });
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/progress/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify existing tests still pass (no regressions yet)**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/progress-page"
```

Expected: PASS (5 tests — all the auth/ownership checks still work since we haven't changed the page yet)

- [ ] **Step 3: Thin the trainer member progress page**

Replace `src/app/(dashboard)/trainer/members/[id]/progress/page.tsx` with:

```typescript
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ProgressContent } from '@/app/(dashboard)/member/progress/_components/progress-content';
import { ProgressSkeleton } from '@/app/(dashboard)/member/progress/_components/progress-skeleton';
import type { UserRole } from '@/types/auth';

export default async function TrainerMemberProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return null;
  const role = session.user.role as UserRole;
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) return null;

  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent memberId={memberId} title={`${member.name}'s Progress`} />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/trainer/progress-page"
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/progress/page.tsx \
        __tests__/app/trainer/progress-page.test.ts
git commit -m "feat: add Suspense streaming to trainer member progress page"
```

---

### Task 8: Owner Trainer Hub — TrainerStatsSection + thin page

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/page.tsx`
- Create: `__tests__/app/owner/trainer-stats-section.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/owner/trainer-stats-section.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = { findAllMembers: jest.fn() };
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };
const mockPlanRepo = { countByCreator: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockPlanRepo),
}));

describe('TrainerStatsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
    mockPlanRepo.countByCreator.mockResolvedValue(0);
  });

  it('fetches members for the trainer', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    await TrainerStatsSection({ trainerId: 't1' });
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith('t1');
  });

  it('fetches template count for the trainer', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    await TrainerStatsSection({ trainerId: 't1' });
    expect(mockPlanRepo.countByCreator).toHaveBeenCalledWith('t1');
  });

  it('renders without throwing', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    const result = await TrainerStatsSection({ trainerId: 't1' });
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/trainer-stats-section"
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create TrainerStatsSection**

```typescript
// src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function TrainerStatsSection({ trainerId }: { trainerId: string }) {
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
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="会员数" value={String(members.length)} />
      <StatCard label="本月训练" value={String(sessionsThisMonth)} unit="次" />
      <StatCard label="训练模板" value={String(templateCount)} />
    </div>
  );
}
```

- [ ] **Step 4: Thin the owner trainer hub page**

Replace `src/app/(dashboard)/owner/trainers/[id]/page.tsx` with:

```typescript
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { TrainerStatsSection } from './_components/trainer-stats-section';

export default async function TrainerHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7">
      <Suspense fallback={<StatCardsSkeleton count={3} className="grid-cols-3" />}>
        <TrainerStatsSection trainerId={trainerId} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/owner/trainer-stats-section"
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/owner/trainers/\[id\]/_components/trainer-stats-section.tsx \
        src/app/\(dashboard\)/owner/trainers/\[id\]/page.tsx \
        __tests__/app/owner/trainer-stats-section.test.ts
git commit -m "feat: add Suspense streaming to owner trainer hub page"
```

---

### Task 9: Final check — full test suite + lint + E2E + docs

**Files:**
- Modify: `docs/INDEX.md`

- [ ] **Step 1: Run full unit test suite**

```bash
pnpm test
```

Expected: All tests pass (100% pass rate).

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No warnings, no errors.

- [ ] **Step 3: Run full E2E suite**

```bash
pnpm test:e2e
```

Expected: All 85 existing specs pass. The refactored pages render the same HTML as before — Suspense boundaries are transparent to Playwright after hydration.

- [ ] **Step 4: Update docs/INDEX.md**

Add to the Implementation Plans table:

```markdown
| React Suspense Streaming | [suspense-streaming-implementation-plan.md](2026-05-01/plans/suspense-streaming-implementation-plan.md) | Complete |
```

- [ ] **Step 5: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark React Suspense streaming implementation as complete"
```
