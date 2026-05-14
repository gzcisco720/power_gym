# Dashboard Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build enriched dashboards for all three roles — Owner (enhance existing), Trainer (new page replacing redirect), Member (new page replacing redirect).

**Architecture:** 4 phases. Phase 1 adds shared repository methods needed by all dashboards. Phases 2–4 each build one role's dashboard as independent Server Components with Suspense-wrapped sections. All data fetched at render time via `Promise.all()`. Uses existing `StatCard`, `EmptyState`, `PageHeader` components and `variants` from `src/lib/animations/variants.ts`.

**Tech Stack:** Next.js App Router (Server Components), MongoDB/Mongoose, Recharts, Framer Motion, TypeScript strict, Tailwind + Indigo Premium tokens, Jest + RTL.

---

## File Map

```
Phase 1 — Repository enhancements
  src/lib/repositories/user.repository.ts              MODIFY
  src/lib/repositories/workout-session.repository.ts   MODIFY
  src/lib/repositories/personal-best.repository.ts     MODIFY
  src/lib/repositories/scheduled-session.repository.ts MODIFY
  __tests__/lib/repositories/user-repo-dashboard.test.ts         NEW
  __tests__/lib/repositories/session-repo-dashboard.test.ts      NEW
  __tests__/lib/repositories/personal-best-repo-dashboard.test.ts NEW

Phase 2 — Owner Dashboard
  src/app/(dashboard)/owner/page.tsx                                MODIFY
  src/app/(dashboard)/owner/_components/dashboard-stats.tsx        MODIFY
  src/app/(dashboard)/owner/_components/member-growth-chart.tsx    NEW
  src/app/(dashboard)/owner/_components/trainer-performance-section.tsx  NEW
  src/app/(dashboard)/owner/_components/equipment-status-section.tsx     NEW
  src/app/(dashboard)/owner/_components/dashboard-stats-skeleton.tsx     MODIFY

Phase 3 — Trainer Dashboard
  src/app/(dashboard)/trainer/page.tsx                              MODIFY (replace redirect)
  src/app/(dashboard)/trainer/_components/trainer-kpi-strip.tsx    NEW
  src/app/(dashboard)/trainer/_components/trainer-today-sessions.tsx     NEW
  src/app/(dashboard)/trainer/_components/trainer-needs-attention.tsx    NEW
  src/app/(dashboard)/trainer/_components/trainer-compliance.tsx   NEW
  src/app/(dashboard)/trainer/_components/trainer-recent-prs.tsx   NEW
  src/app/(dashboard)/trainer/_components/trainer-my-training-card.tsx   NEW
  src/app/(dashboard)/trainer/_components/trainer-dashboard-skeleton.tsx NEW

Phase 4 — Member Dashboard
  src/app/(dashboard)/member/page.tsx                               MODIFY (replace redirect)
  src/app/(dashboard)/member/_components/member-hero.tsx           NEW
  src/app/(dashboard)/member/_components/member-today-workout.tsx  NEW
  src/app/(dashboard)/member/_components/member-key-numbers.tsx    NEW
  src/app/(dashboard)/member/_components/member-nutrition-targets.tsx    NEW
  src/app/(dashboard)/member/_components/member-upcoming-sessions.tsx    NEW
  src/app/(dashboard)/member/_components/member-body-composition.tsx     NEW
  src/app/(dashboard)/member/_components/member-personal-bests.tsx NEW
  src/app/(dashboard)/member/_components/member-dashboard-skeleton.tsx   NEW
```

---

## Phase 1 — Repository Enhancements

### Task 1: Add `findMembersJoinedByMonth` to UserRepository

**Files:**
- Modify: `src/lib/repositories/user.repository.ts`
- Test: `__tests__/lib/repositories/user-repo-dashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/repositories/user-repo-dashboard.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { MongoUserRepository } from '@/lib/repositories/user.repository';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: { aggregate: jest.fn() },
}));

import { UserModel } from '@/lib/db/models/user.model';

describe('MongoUserRepository.findMembersJoinedByMonth', () => {
  it('returns 6-element array with label and newCount', async () => {
    (UserModel.aggregate as jest.Mock).mockResolvedValue([
      { _id: { year: 2026, month: 5 }, count: 3 },
    ]);
    const repo = new MongoUserRepository();
    const result = await repo.findMembersJoinedByMonth(6);
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ label: expect.any(String), newCount: expect.any(Number) });
  });

  it('returns 0 newCount for months with no members', async () => {
    (UserModel.aggregate as jest.Mock).mockResolvedValue([]);
    const repo = new MongoUserRepository();
    const result = await repo.findMembersJoinedByMonth(3);
    expect(result).toHaveLength(3);
    result.forEach(r => expect(r.newCount).toBe(0));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=user-repo-dashboard
```

Expected: FAIL — method not defined.

- [ ] **Step 3: Add interface method and implementation**

In `src/lib/repositories/user.repository.ts`, add to `IUserRepository` interface:

```ts
findMembersJoinedByMonth(months: number): Promise<{ label: string; newCount: number }[]>;
```

Add to `MongoUserRepository` class:

```ts
async findMembersJoinedByMonth(months: number): Promise<{ label: string; newCount: number }[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await UserModel.aggregate<{ _id: { year: number; month: number }; count: number }>([
    { $match: { role: 'member', createdAt: { $gte: since } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
  ]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result: { label: string; newCount: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = rows.find(r => r._id.year === year && r._id.month === month);
    result.push({ label: MONTHS[month - 1], newCount: found?.count ?? 0 });
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=user-repo-dashboard
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/user.repository.ts __tests__/lib/repositories/user-repo-dashboard.test.ts
git commit -m "feat(repo): add findMembersJoinedByMonth to UserRepository"
```

---

### Task 2: Add `findConsecutiveStreakDays` and `countCompletedByMemberSince` to WorkoutSessionRepository

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Test: `__tests__/lib/repositories/session-repo-dashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/repositories/session-repo-dashboard.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: { find: jest.fn(), countDocuments: jest.fn() },
}));

import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

describe('findConsecutiveStreakDays', () => {
  it('returns 0 when no sessions', async () => {
    (WorkoutSessionModel.find as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    const repo = new MongoWorkoutSessionRepository();
    expect(await repo.findConsecutiveStreakDays('abc')).toBe(0);
  });

  it('counts consecutive days ending today', async () => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    (WorkoutSessionModel.find as jest.Mock).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([
        { completedAt: today },
        { completedAt: yesterday },
        { completedAt: twoDaysAgo },
      ]) }),
    });
    const repo = new MongoWorkoutSessionRepository();
    expect(await repo.findConsecutiveStreakDays('abc')).toBe(3);
  });
});

describe('countCompletedByMemberSince', () => {
  it('returns count from countDocuments', async () => {
    (WorkoutSessionModel.countDocuments as jest.Mock).mockResolvedValue(5);
    const repo = new MongoWorkoutSessionRepository();
    const since = new Date(Date.now() - 30 * 86400000);
    expect(await repo.countCompletedByMemberSince('abc', since)).toBe(5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=session-repo-dashboard
```

Expected: FAIL — methods not defined.

- [ ] **Step 3: Add interface methods and implementations**

Add to `IWorkoutSessionRepository` interface:

```ts
findConsecutiveStreakDays(memberId: string): Promise<number>;
countCompletedByMemberSince(memberId: string, since: Date): Promise<number>;
```

Add to `MongoWorkoutSessionRepository`:

```ts
async findConsecutiveStreakDays(memberId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 365);
  const docs = await WorkoutSessionModel.find({
    memberId: new mongoose.Types.ObjectId(memberId),
    completedAt: { $gte: since, $ne: null },
  })
    .select('completedAt')
    .lean();

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const daySet = new Set(
    docs.filter(d => d.completedAt).map(d => key(new Date(d.completedAt!))),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (daySet.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async countCompletedByMemberSince(memberId: string, since: Date): Promise<number> {
  return WorkoutSessionModel.countDocuments({
    memberId: new mongoose.Types.ObjectId(memberId),
    completedAt: { $gte: since, $ne: null },
  });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=session-repo-dashboard
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts __tests__/lib/repositories/session-repo-dashboard.test.ts
git commit -m "feat(repo): add findConsecutiveStreakDays and countCompletedByMemberSince"
```

---

### Task 3: Add `findByMemberIdsSince` to PersonalBestRepository + `findUpcomingByMember` to ScheduledSessionRepository

**Files:**
- Modify: `src/lib/repositories/personal-best.repository.ts`
- Modify: `src/lib/repositories/scheduled-session.repository.ts`
- Test: `__tests__/lib/repositories/personal-best-repo-dashboard.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/repositories/personal-best-repo-dashboard.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: { find: jest.fn() },
}));
jest.mock('@/lib/db/models/scheduled-session.model', () => ({
  ScheduledSessionModel: { find: jest.fn() },
}));

import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

describe('PersonalBestRepository.findByMemberIdsSince', () => {
  it('queries with memberIds array and since date', async () => {
    (PersonalBestModel.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) });
    const repo = new MongoPersonalBestRepository();
    const result = await repo.findByMemberIdsSince(['abc', 'def'], new Date());
    expect(result).toEqual([]);
    expect(PersonalBestModel.find).toHaveBeenCalled();
  });
});

describe('ScheduledSessionRepository.findUpcomingByMember', () => {
  it('returns limited future sessions for member', async () => {
    (ScheduledSessionModel.find as jest.Mock).mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) });
    const repo = new MongoScheduledSessionRepository();
    const result = await repo.findUpcomingByMember('abc', 3);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failures**

```bash
pnpm test -- --testPathPattern=personal-best-repo-dashboard
```

Expected: FAIL — methods not defined.

- [ ] **Step 3: Add to PersonalBestRepository**

Add to `IPersonalBestRepository` interface:

```ts
findByMemberIdsSince(memberIds: string[], since: Date): Promise<IPersonalBest[]>;
```

Add implementation:

```ts
async findByMemberIdsSince(memberIds: string[], since: Date): Promise<IPersonalBest[]> {
  return PersonalBestModel.find({
    memberId: { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) },
    achievedAt: { $gte: since },
  })
    .sort({ achievedAt: -1 })
    .lean();
}
```

- [ ] **Step 4: Add to ScheduledSessionRepository**

Add to `IScheduledSessionRepository` interface:

```ts
findUpcomingByMember(memberId: string, limit: number): Promise<IScheduledSession[]>;
```

Add implementation:

```ts
async findUpcomingByMember(memberId: string, limit: number): Promise<IScheduledSession[]> {
  const now = new Date();
  return ScheduledSessionModel.find({
    memberIds: new mongoose.Types.ObjectId(memberId),
    startTime: { $gte: now },
    cancelledAt: null,
  })
    .sort({ startTime: 1 })
    .limit(limit)
    .lean();
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern=personal-best-repo-dashboard
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Run full test suite**

```bash
pnpm test && pnpm lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/repositories/personal-best.repository.ts src/lib/repositories/scheduled-session.repository.ts __tests__/lib/repositories/personal-best-repo-dashboard.test.ts
git commit -m "feat(repo): add findByMemberIdsSince and findUpcomingByMember"
```

---

## Phase 2 — Owner Dashboard

### Task 4: Expand DashboardStats to 6 KPIs + add MemberGrowthChart

**Files:**
- Modify: `src/app/(dashboard)/owner/_components/dashboard-stats.tsx`
- Create: `src/app/(dashboard)/owner/_components/member-growth-chart.tsx`
- Modify: `src/app/(dashboard)/owner/_components/dashboard-stats-skeleton.tsx`

- [ ] **Step 1: Rewrite `dashboard-stats.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function DashboardStats() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const inviteRepo = new MongoInviteRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const checkInRepo = new MongoCheckInRepository();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now); startOfLastWeek.setDate(now.getDate() - 14);

  const [trainers, members, invites, checkInsThisWeek, checkInsLastWeek] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
    inviteRepo.findAll(),
    checkInRepo.countSince(startOfWeek),
    checkInRepo.countSince(startOfLastWeek),
  ]);

  const memberIds = members.map(m => m._id.toString());
  const [sessionsThisMonth, sessionsLastMonth, sessionsToday, membersThisMonth] = await Promise.all([
    sessionRepo.countByMemberIdsSince(memberIds, startOfMonth),
    sessionRepo.countByMemberIdsSince(memberIds, startOfLastMonth),
    sessionRepo.countByMemberIdsSince(memberIds, startOfDay),
    userRepo.findMembersJoinedByMonth(1).then(r => r[0]?.newCount ?? 0),
  ]);

  const pendingInvites = invites.filter(i => i.usedAt === null && i.expiresAt > now);
  const expiringSoon = pendingInvites.filter(i => i.expiresAt < new Date(now.getTime() + 3 * 86400000));

  const sessionGrowth = sessionsLastMonth > 0
    ? Math.round(((sessionsThisMonth - sessionsLastMonth) / sessionsLastMonth) * 100)
    : 0;

  const checkInRate = checkInsLastWeek > 0
    ? Math.round((checkInsThisWeek / checkInsLastWeek) * 100) - 100
    : 0;

  const checkInDelta = checkInRate >= 0
    ? `↑ ${checkInRate}% vs last week`
    : `↓ ${Math.abs(checkInRate)}% vs last week`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard
        label="Trainers"
        value={String(trainers.length)}
        accentColor="primary"
      />
      <StatCard
        label="Members"
        value={String(members.length)}
        delta={`↑ ${membersThisMonth} joined this month`}
      />
      <StatCard
        label="Sessions / Month"
        value={String(sessionsThisMonth)}
        accentColor="success"
        delta={sessionGrowth >= 0 ? `↑ ${sessionGrowth}% vs last month` : `↓ ${Math.abs(sessionGrowth)}% vs last month`}
      />
      <StatCard
        label="Active Today"
        value={String(sessionsToday)}
        delta="sessions started today"
      />
      <StatCard
        label="Check-in Rate"
        value={`${Math.min(Math.round((checkInsThisWeek / Math.max(members.length, 1)) * 100), 100)}%`}
        accentColor="achievement"
        delta={checkInDelta}
      />
      <StatCard
        label="Pending Invites"
        value={String(pendingInvites.length)}
        delta={expiringSoon.length > 0 ? `${expiringSoon.length} expiring soon` : 'all valid'}
      />
    </div>
  );
}
```

Note: `checkInRepo.countSince` is a new method — add it to `ICheckInRepository` and `MongoCheckInRepository`:

```ts
// Add to interface:
countSince(since: Date): Promise<number>;

// Add implementation:
async countSince(since: Date): Promise<number> {
  return CheckInModel.countDocuments({ submittedAt: { $gte: since } });
}
```

- [ ] **Step 2: Create `member-growth-chart.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MemberGrowthChartClient } from './member-growth-chart-client';

export async function MemberGrowthChart() {
  await connectDB();
  const data = await new MongoUserRepository().findMembersJoinedByMonth(6);
  return <MemberGrowthChartClient data={data} />;
}
```

Create `src/app/(dashboard)/owner/_components/member-growth-chart-client.tsx`:

```tsx
'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { label: string; newCount: number }[];
}

export function MemberGrowthChartClient({ data }: Props) {
  if (data.every(d => d.newCount === 0)) {
    return (
      <div className="flex items-center justify-center h-24 text-foreground/40 text-sm">
        No member data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} barSize={20}>
        <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#a5b4fc' }}
          formatter={(v: number) => [`${v} new`, 'Members']}
        />
        <Bar dataKey="newCount" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Update `dashboard-stats-skeleton.tsx`** to match 6-card grid:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-xl" />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/owner/_components/
git commit -m "feat(owner): expand DashboardStats to 6 KPIs, add MemberGrowthChart"
```

---

### Task 5: Add TrainerPerformanceSection + EquipmentStatusSection

**Files:**
- Create: `src/app/(dashboard)/owner/_components/trainer-performance-section.tsx`
- Create: `src/app/(dashboard)/owner/_components/equipment-status-section.tsx`

- [ ] **Step 1: Create `trainer-performance-section.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const TRAINER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export async function TrainerPerformanceSection() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const trainers = await userRepo.findByRole('trainer');
  if (trainers.length === 0) {
    return <EmptyState heading="No trainers yet" description="Invite a trainer to see performance data." />;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const trainerStats = await Promise.all(
    trainers.map(async (trainer, i) => {
      const members = await userRepo.findAllMembers(trainer._id.toString());
      const memberIds = members.map(m => m._id.toString());
      const sessions = memberIds.length > 0
        ? await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
        : 0;
      return { trainer, memberCount: members.length, sessions, color: TRAINER_COLORS[i % TRAINER_COLORS.length] };
    }),
  );

  trainerStats.sort((a, b) => b.sessions - a.sessions);
  const maxSessions = Math.max(...trainerStats.map(t => t.sessions), 1);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Trainer Performance — This Month
      </div>
      <div className="space-y-3">
        {trainerStats.map(({ trainer, memberCount, sessions, color }) => (
          <div key={trainer._id.toString()} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {initials(trainer.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">{trainer.name}</div>
              <div className="mt-1 h-[3px] bg-white/[.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round((sessions / maxSessions) * 100)}%`, background: color }}
                />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[12px] font-bold" style={{ color }}>{sessions} sessions</div>
              <div className="text-[9px] text-foreground/30 mt-0.5">{memberCount} members</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `equipment-status-section.tsx`**

```tsx
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; pillClass: string }> = {
  active:      { label: 'Active',      pillClass: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25' },
  maintenance: { label: 'Maintenance', pillClass: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25' },
  retired:     { label: 'Retired',     pillClass: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25' },
};

export async function EquipmentStatusSection() {
  await connectDB();
  const equipment = await new MongoEquipmentRepository().findAll();

  const byStatus = {
    active:      equipment.filter(e => e.status === 'active').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    retired:     equipment.filter(e => e.status === 'retired').length,
  };

  const nonActive = equipment
    .filter(e => e.status !== 'active')
    .sort((a, b) => {
      const order: Record<EquipmentStatus, number> = { retired: 0, maintenance: 1, active: 2 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 5);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Equipment Status
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['active', 'maintenance', 'retired'] as EquipmentStatus[]).map(s => (
          <div
            key={s}
            className={cn('rounded-lg p-2 text-center', STATUS_CONFIG[s].pillClass.replace('ring-1', '').replace(/ring-\S+/, ''))}
          >
            <div className="text-[16px] font-bold">{byStatus[s]}</div>
            <div className="text-[8px] uppercase tracking-[1px] mt-0.5 opacity-60">
              {STATUS_CONFIG[s].label}
            </div>
          </div>
        ))}
      </div>

      {/* Problem equipment list */}
      {nonActive.length === 0 ? (
        <p className="text-[11px] text-foreground/40 text-center py-2">All equipment active ✓</p>
      ) : (
        <div className="space-y-0">
          {nonActive.map(item => (
            <div key={item._id.toString()} className="flex items-center gap-2 py-2 border-b border-white/[.04] last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{item.name}</div>
                {item.note && <div className="text-[9px] text-foreground/35 mt-0.5 truncate">{item.note}</div>}
              </div>
              <span className={cn('text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0', STATUS_CONFIG[item.status].pillClass)}>
                {STATUS_CONFIG[item.status].label}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/owner/equipment" className="block mt-3 text-[10px] text-foreground/35 hover:text-foreground/60 transition-colors text-center">
        View all equipment →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/owner/_components/trainer-performance-section.tsx src/app/\(dashboard\)/owner/_components/equipment-status-section.tsx
git commit -m "feat(owner): add TrainerPerformanceSection and EquipmentStatusSection"
```

---

### Task 6: Wire up Owner page

**Files:**
- Modify: `src/app/(dashboard)/owner/page.tsx`
- Create: `src/app/(dashboard)/owner/_components/trainer-breakdown-skeleton.tsx` (update)

- [ ] **Step 1: Rewrite `owner/page.tsx`**

```tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from './_components/dashboard-stats';
import { DashboardStatsSkeleton } from './_components/dashboard-stats-skeleton';
import { MemberGrowthChart } from './_components/member-growth-chart';
import { TrainerPerformanceSection } from './_components/trainer-performance-section';
import { EquipmentStatusSection } from './_components/equipment-status-section';
import { Skeleton } from '@/components/ui/skeleton';

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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Invite Trainer
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 space-y-6">

        {/* KPI cards */}
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>

        {/* Member growth chart */}
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
            Member Growth — Last 6 Months
          </div>
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <MemberGrowthChart />
          </Suspense>
        </div>

        {/* Trainer performance + Equipment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerPerformanceSection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <EquipmentStatusSection />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests + lint + dev server smoke test**

```bash
pnpm test && pnpm lint
```

Start `pnpm dev` and visit `/owner` — verify 6 KPI cards, growth chart, trainer performance bars, equipment status panel all render.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/owner/
git commit -m "feat(owner): complete Owner dashboard with 6 KPIs, growth chart, trainer perf, equipment"
```

---

## Phase 3 — Trainer Dashboard

### Task 7: Build Trainer dashboard components

**Files:**
- Create: `src/app/(dashboard)/trainer/_components/trainer-kpi-strip.tsx`
- Create: `src/app/(dashboard)/trainer/_components/trainer-today-sessions.tsx`
- Create: `src/app/(dashboard)/trainer/_components/trainer-needs-attention.tsx`

- [ ] **Step 1: Create `trainer-kpi-strip.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';
import { auth } from '@/lib/auth/auth';

export async function TrainerKpiStrip() {
  const session = await auth();
  if (!session?.user) return null;
  const trainerId = session.user.id;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map(m => m._id.toString());

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [sessionsThisMonth, sessionsToday, completedLast30] = await Promise.all([
    memberIds.length > 0 ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth) : Promise.resolve(0),
    memberIds.length > 0 ? sessionRepo.countByMemberIdsSince(memberIds, startOfDay) : Promise.resolve(0),
    memberIds.length > 0
      ? Promise.all(memberIds.map(id => sessionRepo.countCompletedByMemberSince(id, thirtyDaysAgo)))
      : Promise.resolve([]),
  ]);

  const membersWithoutPlan = members.filter(m => !m.trainerId).length; // proxy: members needing attention
  const idleMembers = await Promise.all(
    members.map(async m => {
      const sessions = await sessionRepo.countCompletedByMemberSince(m._id.toString(), sevenDaysAgo);
      return sessions === 0;
    }),
  );
  const needsAttentionCount = idleMembers.filter(Boolean).length;

  const totalScheduled = memberIds.length * 4; // rough: ~4 sessions/month per member
  const complianceRate = totalScheduled > 0
    ? Math.min(Math.round((completedLast30.reduce((a, b) => a + b, 0) / totalScheduled) * 100), 100)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Members" value={String(members.length)} accentColor="primary" />
      <StatCard label="Sessions Today" value={String(sessionsToday)} accentColor="success" delta={`↑ ${sessionsThisMonth} this month`} />
      <StatCard label="30-day Compliance" value={`${complianceRate}%`} accentColor="achievement" delta="sessions completed" />
      <StatCard label="Needs Attention" value={String(needsAttentionCount)} delta="7+ days no session" />
    </div>
  );
}
```

- [ ] **Step 2: Create `trainer-today-sessions.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { auth } from '@/lib/auth/auth';
import { cn } from '@/lib/utils';

export async function TrainerTodaySessions() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const scheduledRepo = new MongoScheduledSessionRepository();
  const bodyTestRepo = new MongoBodyTestRepository();
  const planRepo = new MongoMemberPlanRepository();

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const todaySessions = await scheduledRepo.findByDateRange(todayStart, todayEnd, {
    trainerId: session.user.id,
  });

  if (todaySessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Today's Sessions</div>
        <p className="text-[11px] text-foreground/40 text-center py-3">No sessions scheduled today</p>
      </div>
    );
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const enriched = await Promise.all(
    todaySessions.map(async s => {
      const memberId = s.memberIds[0]?.toString();
      const [latestTest, plan] = memberId
        ? await Promise.all([
            bodyTestRepo.findLatestByMember(memberId),
            planRepo.findActive(memberId),
          ])
        : [null, null];

      const testOverdue = latestTest
        ? new Date(latestTest.recordedAt) < thirtyDaysAgo
        : true;

      const fmt = (d: Date) =>
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      return { session: s, testOverdue, hasPlan: !!plan, timeRange: `${fmt(s.startTime)} – ${fmt(s.endTime)}` };
    }),
  );

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Today's Sessions</div>
      <div className="space-y-2">
        {enriched.map(({ session: s, testOverdue, hasPlan, timeRange }) => (
          <div
            key={s._id.toString()}
            className="rounded-lg p-3 border-l-2 bg-primary/[.07] border-primary/60"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-foreground">{s.title}</div>
              <div className="text-[10px] text-primary-light">{timeRange}</div>
            </div>
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {!hasPlan && (
                <span className="text-[9px] font-bold bg-red-500/15 text-red-400 ring-1 ring-red-500/25 rounded px-1.5 py-0.5">
                  ⚠ No plan
                </span>
              )}
              {testOverdue && (
                <span className="text-[9px] font-bold bg-primary/15 text-primary-light ring-1 ring-primary/25 rounded px-1.5 py-0.5">
                  Body test due
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `trainer-needs-attention.tsx`**

```tsx
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { auth } from '@/lib/auth/auth';

interface AlertItem {
  memberId: string;
  memberName: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  severity: 'red' | 'amber' | 'indigo' | 'pink';
}

export async function TrainerNeedsAttention() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planRepo = new MongoMemberPlanRepository();
  const bodyTestRepo = new MongoBodyTestRepository();
  const nutritionRepo = new MongoMemberNutritionPlanRepository();

  const members = await userRepo.findAllMembers(session.user.id);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const alerts: AlertItem[] = [];

  await Promise.all(
    members.map(async member => {
      const id = member._id.toString();
      const [sessions30d, plan, latestTest, nutritionPlan] = await Promise.all([
        sessionRepo.countCompletedByMemberSince(id, sevenDaysAgo),
        planRepo.findActive(id),
        bodyTestRepo.findLatestByMember(id),
        nutritionRepo.findActive(id),
      ]);

      if (!plan) {
        alerts.push({ memberId: id, memberName: member.name, message: 'No training plan', actionLabel: 'Assign Plan', actionHref: `/trainer/members/${id}/plan`, severity: 'amber' });
      }
      if (!nutritionPlan) {
        alerts.push({ memberId: id, memberName: member.name, message: 'No nutrition plan', actionLabel: 'Assign Nutrition', actionHref: `/trainer/members/${id}/nutrition`, severity: 'pink' });
      }
      if (latestTest && new Date(latestTest.recordedAt) < thirtyDaysAgo) {
        alerts.push({ memberId: id, memberName: member.name, message: 'Body test 30+ days ago', actionLabel: 'Log Test', actionHref: `/trainer/members/${id}/body-tests`, severity: 'indigo' });
      }
      if (sessions30d === 0) {
        const sevenAgo = new Date(now.getTime() - 7 * 86400000);
        const daysSince = Math.floor((now.getTime() - sevenAgo.getTime()) / 86400000);
        alerts.push({ memberId: id, memberName: member.name, message: `${daysSince}+ days idle`, actionLabel: '', actionHref: `/trainer/members/${id}`, severity: 'red' });
      }
    }),
  );

  const severityOrder = { red: 0, amber: 1, indigo: 2, pink: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const shown = alerts.slice(0, 6);

  const pillClass: Record<AlertItem['severity'], string> = {
    red:   'bg-red-500/15 text-red-400 ring-1 ring-red-500/25',
    amber: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
    indigo:'bg-primary/15 text-primary-light ring-1 ring-primary/25',
    pink:  'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/25',
  };

  if (shown.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Needs Attention</div>
        <p className="text-[11px] text-foreground/40 text-center py-3">All members on track ✓</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Needs Attention</div>
      <div className="space-y-0">
        {shown.map((alert, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-white/[.04] last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">{alert.memberName}</div>
              <div className="text-[9px] text-foreground/35 mt-0.5">{alert.message}</div>
            </div>
            {alert.actionLabel ? (
              <Link href={alert.actionHref} className={`text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0 ${pillClass[alert.severity]}`}>
                {alert.actionLabel}
              </Link>
            ) : (
              <span className={`text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0 ${pillClass[alert.severity]}`}>
                {alert.message}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/_components/
git commit -m "feat(trainer): add KPI strip, today sessions, needs attention components"
```

---

### Task 8: Build Trainer compliance, PRs, self-training card + wire page

**Files:**
- Create: `src/app/(dashboard)/trainer/_components/trainer-compliance.tsx`
- Create: `src/app/(dashboard)/trainer/_components/trainer-recent-prs.tsx`
- Create: `src/app/(dashboard)/trainer/_components/trainer-my-training-card.tsx`
- Modify: `src/app/(dashboard)/trainer/page.tsx`

- [ ] **Step 1: Create `trainer-compliance.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { auth } from '@/lib/auth/auth';
import { cn } from '@/lib/utils';

export async function TrainerCompliance() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);
  if (members.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Member Compliance — 30 days</div>
        <p className="text-[11px] text-foreground/40 text-center py-3">No members yet</p>
      </div>
    );
  }

  const sessionRepo = new MongoWorkoutSessionRepository();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const rows = await Promise.all(
    members.map(async m => {
      const count = await sessionRepo.countCompletedByMemberSince(m._id.toString(), thirtyDaysAgo);
      const pct = Math.min(Math.round((count / 12) * 100), 100); // 12 = ~3/week target
      return { name: m.name, count, pct };
    }),
  );
  rows.sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Member Compliance — 30 days</div>
      <div className="space-y-3">
        {rows.map(({ name, count, pct }) => {
          const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
          return (
            <div key={name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{name}</div>
                <div className="mt-1 h-[3px] bg-white/[.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              <div className="text-[12px] font-bold flex-shrink-0" style={{ color }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `trainer-recent-prs.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerRecentPrs() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);
  const memberIds = members.map(m => m._id.toString());

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const prs = memberIds.length > 0
    ? await new MongoPersonalBestRepository().findByMemberIdsSince(memberIds, sevenDaysAgo)
    : [];

  const memberMap = Object.fromEntries(members.map(m => [m._id.toString(), m.name]));

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Recent PRs — This Week</div>
      {prs.length === 0 ? (
        <p className="text-[11px] text-foreground/40 text-center py-3">No new PRs this week</p>
      ) : (
        <>
          <div className="space-y-0">
            {prs.slice(0, 5).map(pr => (
              <div key={pr._id.toString()} className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0">
                <div>
                  <div className="text-[10px] font-bold text-foreground">{memberMap[pr.memberId.toString()] ?? 'Member'}</div>
                  <div className="text-[9px] text-foreground/35 mt-0.5">{pr.exerciseName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-amber-400">{pr.estimatedOneRM.toFixed(1)} kg</div>
                  <div className="text-[9px] font-bold bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/22 rounded px-1.5 py-0.5 mt-0.5">
                    ↑ PR
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-foreground/25 text-center mt-3">{prs.length} PR{prs.length !== 1 ? 's' : ''} this week</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `trainer-my-training-card.tsx`**

```tsx
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerMyTrainingCard() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const selfRepo = new MongoSelfWorkoutLogRepository();

  const userId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  const [recent, logs90d, sessionsThisMonth] = await Promise.all([
    selfRepo.findRecent(userId, 1),
    selfRepo.findByUserDateRange(userId, ninetyDaysAgo, now),
    selfRepo.findByUserDateRange(userId, startOfMonth, now).then(r => r.length),
  ]);

  // Compute streak from completed self-workout logs
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const daySet = new Set(
    logs90d.filter(l => l.completedAt).map(l => key(new Date(l.completedAt!))),
  );
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (daySet.has(key(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

  const last = recent[0];
  const lastLabel = last
    ? (() => {
        const d = new Date(last.completedAt ?? last.startedAt);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        return diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
      })()
    : null;

  // 14-day heatmap — reuse logs90d filtered to last 14 days
  const heatmapSet = new Set(
    logs90d
      .filter(l => l.completedAt && new Date(l.completedAt) >= fourteenDaysAgo)
      .map(l => key(new Date(l.completedAt!))),
  );

  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { active: heatmapSet.has(key(d)), isToday: i === 13 };
  });

  return (
    <Link href="/trainer/my-training" className="block">
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 hover:ring-white/[.14] transition-all">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">My Training</div>
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-4xl font-extrabold tracking-tighter"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {streak}
          </span>
          <span className="text-[11px] text-foreground/35">day streak 🔥</span>
        </div>
        {lastLabel && <div className="text-[9px] text-foreground/30 mb-3">Last: {last?.dayName ?? 'session'} · {lastLabel}</div>}

        <div className="flex gap-1 flex-wrap mb-3">
          {dots.map((dot, i) => (
            <div
              key={i}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ background: dot.active ? (dot.isToday ? '#6366f1' : 'rgba(99,102,241,0.55)') : 'rgba(255,255,255,0.05)' }}
            />
          ))}
        </div>

        <div className="border-t border-white/[.05] pt-3 flex justify-between">
          <div className="text-[9px] text-foreground/35">This month</div>
          <div className="text-[12px] font-bold text-primary-light">{sessionsThisMonth} sessions</div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Rewrite `trainer/page.tsx`** (replace redirect)

```tsx
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainerKpiStrip } from './_components/trainer-kpi-strip';
import { TrainerTodaySessions } from './_components/trainer-today-sessions';
import { TrainerNeedsAttention } from './_components/trainer-needs-attention';
import { TrainerCompliance } from './_components/trainer-compliance';
import { TrainerRecentPrs } from './_components/trainer-recent-prs';
import { TrainerMyTrainingCard } from './_components/trainer-my-training-card';

export default async function TrainerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your members at a glance" />
      <div className="px-4 sm:px-8 py-6 space-y-4">

        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-[72px] rounded-xl"/>)}</div>}>
          <TrainerKpiStrip />
        </Suspense>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerTodaySessions />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerNeedsAttention />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerCompliance />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerRecentPrs />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerMyTrainingCard />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/trainer/
git commit -m "feat(trainer): complete Trainer dashboard — compliance, PRs, self-training, full page"
```

---

## Phase 4 — Member Dashboard

### Task 9: Build Member hero, today workout, key numbers

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-hero.tsx`
- Create: `src/app/(dashboard)/member/_components/member-today-workout.tsx`
- Create: `src/app/(dashboard)/member/_components/member-key-numbers.tsx`

- [ ] **Step 1: Create `member-hero.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function greetingEmoji(): string {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '💪';
  return '🌙';
}

export async function MemberHero() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;
  const sessionRepo = new MongoWorkoutSessionRepository();
  const scheduledRepo = new MongoScheduledSessionRepository();

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [streak, todaySessions] = await Promise.all([
    sessionRepo.findConsecutiveStreakDays(memberId),
    scheduledRepo.findUpcomingByMember(memberId, 1).then(r =>
      r.filter(s => s.startTime >= todayStart && s.startTime <= todayEnd)
    ),
  ]);

  const todaySession = todaySessions[0];
  const subLine = todaySession
    ? `Session at ${todaySession.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'No session scheduled today';

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          {greeting()}, {session.user.firstName ?? 'there'} {greetingEmoji()}
        </h2>
        <p className="text-[11px] text-foreground/40 mt-1">{subLine}</p>
      </div>
      {streak > 0 && (
        <div className="text-right flex-shrink-0 ml-4">
          <div
            className="text-[44px] font-extrabold tracking-[-2px] leading-none"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {streak}
          </div>
          <div className="text-[9px] text-foreground/30 mt-1">day streak 🔥</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `member-today-workout.tsx`**

```tsx
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export async function MemberTodayWorkout() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 mb-4">
        <p className="text-[11px] text-foreground/40 text-center py-2">
          No training plan assigned yet — ask your trainer
        </p>
      </div>
    );
  }

  const day = plan.days[0];
  if (!day) return null;

  const exerciseNames = day.exercises.map(e => e.exerciseName);
  const shown = exerciseNames.slice(0, 5);
  const overflow = exerciseNames.length - shown.length;
  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <div className="bg-primary/[.09] ring-1 ring-primary/25 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[18px] font-extrabold tracking-tight text-foreground">{day.name}</div>
          <div className="text-[10px] text-foreground/40 mt-1">
            {day.exercises.length} exercises · {totalSets} sets
          </div>
        </div>
        <Link
          href="/member/plan"
          className="bg-primary/30 ring-1 ring-primary/50 text-primary-light text-[11px] font-bold rounded-lg px-3 py-1.5 hover:bg-primary/40 transition-colors flex-shrink-0"
        >
          Start →
        </Link>
      </div>
      <div className="flex gap-1.5 flex-wrap mt-3">
        {shown.map(name => (
          <span key={name} className="text-[9px] bg-white/[.06] text-foreground/50 ring-1 ring-white/[.08] rounded px-2 py-0.5">
            {name}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[9px] bg-white/[.06] text-foreground/40 ring-1 ring-white/[.08] rounded px-2 py-0.5">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `member-key-numbers.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function MemberKeyNumbers() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const bodyTestRepo = new MongoBodyTestRepository();
  const pbRepo = new MongoPersonalBestRepository();

  const [tests, pbs] = await Promise.all([
    bodyTestRepo.findByMember(session.user.id),
    pbRepo.findByMember(session.user.id),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;

  const weightDelta = latest && previous
    ? (latest.weight - previous.weight).toFixed(1)
    : null;
  const bfDelta = latest && previous
    ? (latest.bodyFatPct - previous.bodyFatPct).toFixed(1)
    : null;

  const topPb = pbs.sort((a, b) => b.estimatedOneRM - a.estimatedOneRM)[0] ?? null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const isNewPr = topPb && new Date(topPb.achievedAt) > sevenDaysAgo;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard
        label="Weight"
        value={latest ? `${latest.weight.toFixed(1)}` : '—'}
        unit={latest ? 'kg' : undefined}
        accentColor={weightDelta && parseFloat(weightDelta) < 0 ? 'success' : undefined}
        delta={weightDelta ? `${parseFloat(weightDelta) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(weightDelta))} vs last test` : 'No test yet'}
      />
      <StatCard
        label="Body Fat"
        value={latest ? `${latest.bodyFatPercent.toFixed(1)}` : '—'}
        unit={latest ? '%' : undefined}
        accentColor={bfDelta && parseFloat(bfDelta) < 0 ? 'success' : undefined}
        delta={bfDelta ? `${parseFloat(bfDelta) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(bfDelta)).toFixed(1)}% vs last` : 'No test yet'}
      />
      <StatCard
        label={topPb ? topPb.exerciseName : 'Top PR'}
        value={topPb ? `${topPb.estimatedOneRM.toFixed(1)}` : '—'}
        unit={topPb ? 'kg' : undefined}
        accentColor={isNewPr ? 'achievement' : undefined}
        delta={isNewPr ? '↑ New PR this week' : topPb ? `Set ${new Date(topPb.achievedAt).toLocaleDateString('en-GB',{month:'short',day:'numeric'})}` : 'No PRs yet'}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/member/_components/
git commit -m "feat(member): add MemberHero, MemberTodayWorkout, MemberKeyNumbers"
```

---

### Task 10: Build Member nutrition targets, upcoming sessions, body composition, personal bests + wire page

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-nutrition-targets.tsx`
- Create: `src/app/(dashboard)/member/_components/member-upcoming-sessions.tsx`
- Create: `src/app/(dashboard)/member/_components/member-body-composition.tsx`
- Create: `src/app/(dashboard)/member/_components/member-personal-bests.tsx`
- Modify: `src/app/(dashboard)/member/page.tsx`

- [ ] **Step 1: Create `member-nutrition-targets.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';
import { MacroPill } from '@/components/nutrition/macro-pill';

export async function MemberNutritionTargets() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Today's Nutrition Targets</div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No nutrition plan assigned</p>
      </div>
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const startISO = new Date(plan.assignedAt).toISOString().slice(0, 10);
  const dayTypeName = resolveDayType(plan.schedule, todayISO, startISO);
  const dayType = plan.dayTypes.find(d => d.name === dayTypeName) ?? plan.dayTypes[0];

  if (!dayType) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Today's Nutrition Targets</div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No day type scheduled for today</p>
      </div>
    );
  }

  const rows = [
    { label: 'Protein', value: `${dayType.protein} g`, color: 'text-emerald-400' },
    { label: 'Carbs',   value: `${dayType.carbs} g`,   color: 'text-amber-400'   },
    { label: 'Fat',     value: `${dayType.fat} g`,     color: 'text-pink-400'    },
    { label: 'Calories',value: `${dayType.kcal} kcal`, color: 'text-foreground/70' },
  ];

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold">Today's Nutrition Targets</div>
        <span className="text-[9px] text-foreground/25 bg-white/[.04] rounded px-1.5 py-0.5">{dayType.name}</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[1px] text-foreground/35">{label}</div>
            <div className={`text-[13px] font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `member-upcoming-sessions.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { cn } from '@/lib/utils';

export async function MemberUpcomingSessions() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const sessions = await new MongoScheduledSessionRepository().findUpcomingByMember(session.user.id, 3);

  if (sessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Upcoming Sessions</div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No sessions scheduled</p>
      </div>
    );
  }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Upcoming Sessions</div>
      <div className="space-y-0">
        {sessions.map(s => {
          const isToday = s.startTime >= todayStart && s.startTime <= todayEnd;
          const diffDays = Math.ceil((s.startTime.getTime() - now.getTime()) / 86400000);
          const badge = isToday ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days`;
          const badgeClass = isToday
            ? 'bg-primary/15 text-primary-light ring-1 ring-primary/25'
            : diffDays <= 2
            ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
            : 'bg-white/[.05] text-foreground/35 ring-1 ring-white/[.08]';

          return (
            <div key={s._id.toString()} className="flex items-center gap-3 py-2.5 border-b border-white/[.04] last:border-0">
              <div className="text-[10px] font-bold text-primary-light min-w-[60px]">
                {s.startTime.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{s.title}</div>
              </div>
              <span className={cn('text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0', badgeClass)}>{badge}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `member-body-composition.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { cn } from '@/lib/utils';

export async function MemberBodyComposition() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(session.user.id);

  if (tests.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Body Composition</div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No body tests recorded yet</p>
      </div>
    );
  }

  const latest = tests[0];
  const previous = tests[1] ?? null;

  const rows = [
    { label: 'Weight',    curr: `${latest.weight.toFixed(1)} kg`,           prev: previous ? `${previous.weight.toFixed(1)} kg` : null,          delta: previous ? latest.weight - previous.weight : null,              lowerIsBetter: true },
    { label: 'Body Fat',  curr: `${latest.bodyFatPct.toFixed(1)}%`,          prev: previous ? `${previous.bodyFatPct.toFixed(1)}%` : null,         delta: previous ? latest.bodyFatPct - previous.bodyFatPct : null,      lowerIsBetter: true },
    { label: 'Lean Mass', curr: `${latest.leanMassKg.toFixed(1)} kg`,        prev: previous ? `${previous.leanMassKg.toFixed(1)} kg` : null,       delta: previous ? latest.leanMassKg - previous.leanMassKg : null,      lowerIsBetter: false },
    { label: 'Fat Mass',  curr: `${latest.fatMassKg.toFixed(1)} kg`,         prev: previous ? `${previous.fatMassKg.toFixed(1)} kg` : null,        delta: previous ? latest.fatMassKg - previous.fatMassKg : null,        lowerIsBetter: true },
  ];

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Body Composition</div>
      <div className="space-y-0">
        {rows.map(({ label, curr, prev, delta, lowerIsBetter }) => {
          const improved = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
          const deltaTxt = delta !== null
            ? `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(1)}`
            : null;

          return (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0">
              <div className="text-[9px] uppercase tracking-[0.8px] text-foreground/30">{label}</div>
              <div className="flex items-center gap-2">
                {prev && <span className="text-[10px] text-foreground/30">{prev}</span>}
                {prev && <span className="text-[9px] text-foreground/30">→</span>}
                <span className={cn('text-[13px] font-bold', improved ? 'text-emerald-400' : 'text-foreground')}>
                  {curr}
                </span>
                {deltaTxt && (
                  <span className={cn('text-[9px] font-bold rounded px-1.5 py-0.5', improved ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-white/[.05] text-foreground/35 ring-1 ring-white/[.08]')}>
                    {deltaTxt}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {previous && (
        <div className="text-[9px] text-foreground/20 text-right mt-2">
          {new Date(previous.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} → {new Date(latest.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `member-personal-bests.tsx`**

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { cn } from '@/lib/utils';

export async function MemberPersonalBests() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const pbs = await new MongoPersonalBestRepository().findByMember(session.user.id);

  if (pbs.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Personal Bests</div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No PRs yet — keep training!</p>
      </div>
    );
  }

  const sorted = [...pbs].sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Personal Bests</div>
      <div className="space-y-0">
        {sorted.slice(0, 6).map(pb => {
          const isRecent = new Date(pb.achievedAt) > sevenDaysAgo;
          return (
            <div key={pb._id.toString()} className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0">
              <div>
                <div className="text-[11px] font-semibold text-foreground">{pb.exerciseName}</div>
                <div className="text-[9px] text-foreground/30 mt-0.5">
                  {new Date(pb.achievedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-amber-400">{pb.estimatedOneRM.toFixed(1)} kg</span>
                <span className={cn('text-[9px] font-bold rounded px-1.5 py-0.5', isRecent ? 'bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/22' : 'bg-white/[.05] text-foreground/30 ring-1 ring-white/[.07]')}>
                  {isRecent ? '↑ PR' : 'stable'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `member/page.tsx`** (replace redirect)

```tsx
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberHero } from './_components/member-hero';
import { MemberTodayWorkout } from './_components/member-today-workout';
import { MemberKeyNumbers } from './_components/member-key-numbers';
import { MemberNutritionTargets } from './_components/member-nutrition-targets';
import { MemberUpcomingSessions } from './_components/member-upcoming-sessions';
import { MemberBodyComposition } from './_components/member-body-composition';
import { MemberPersonalBests } from './_components/member-personal-bests';

export default async function MemberDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="px-4 sm:px-8 py-6">

        {/* Hero: greeting + streak */}
        <Suspense fallback={<Skeleton className="h-14 mb-4 rounded-xl" />}>
          <MemberHero />
        </Suspense>

        {/* Today's workout card */}
        <Suspense fallback={<Skeleton className="h-28 mb-4 rounded-xl" />}>
          <MemberTodayWorkout />
        </Suspense>

        {/* 3 key numbers */}
        <Suspense fallback={<div className="grid grid-cols-3 gap-3 mb-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-[72px] rounded-xl"/>)}</div>}>
          <MemberKeyNumbers />
        </Suspense>

        {/* Nutrition + Upcoming sessions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
            <MemberNutritionTargets />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
            <MemberUpcomingSessions />
          </Suspense>
        </div>

        {/* Body composition + PRs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MemberBodyComposition />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MemberPersonalBests />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run full test suite + lint + build**

```bash
pnpm test && pnpm lint && pnpm build
```

Expected: all 1235+ tests pass, 0 lint errors, build clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/member/
git commit -m "feat(member): complete Member dashboard — hero, workout, numbers, nutrition, sessions, body comp, PRs"
```

---

## Final Verification

- [ ] Start `pnpm dev` and smoke-test all three dashboards:
  - `/owner` — 6 KPI cards, growth chart, trainer bars, equipment status
  - `/trainer` — 4 KPI cards, today sessions, needs attention, compliance, PRs, my training
  - `/member` — greeting + streak, today workout, 3 numbers, nutrition targets, upcoming sessions, body comp, PRs
- [ ] Verify Suspense skeleton fallbacks show during load
- [ ] Verify empty states render correctly (no members, no plan, no tests)
- [ ] Run `pnpm test && pnpm lint && pnpm build` one final time
