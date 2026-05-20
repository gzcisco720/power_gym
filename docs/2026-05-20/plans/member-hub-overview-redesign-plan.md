# Member Hub Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse 5-card + injury-list Overview tab with an information-dense bento grid: 4 stat cards with trend deltas (left top), a Plan card with Log Workout CTA (left bottom), and a persistent Health panel showing injuries + medications (right, full height).

**Architecture:** Three new/renamed server components (`StatStripSection`, `PlanCardSection`, `HealthPanelSection`) each own their own data fetches and Suspense skeletons. `page.tsx` is reduced to a grid shell. `StatCard` gets a backward-compatible `deltaVariant` prop for colored trend indicators.

**Tech Stack:** Next.js App Router (Server Components), Tailwind CSS, Framer Motion (existing StatCard animation), Mongoose repositories (all existing)

---

## File Map

| Action | File | Export |
|---|---|---|
| Modify | `src/components/shared/stat-card.tsx` | `StatCard` (add `deltaVariant` prop) |
| Rename + rewrite | `src/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section.tsx` → `stat-strip-section.tsx` | `StatStripSection` |
| Create | `src/app/(dashboard)/trainer/members/[id]/_components/plan-card-section.tsx` | `PlanCardSection` |
| Rename + rewrite | `src/app/(dashboard)/trainer/members/[id]/_components/health-section.tsx` → `health-panel-section.tsx` | `HealthPanelSection` |
| Delete | `src/app/(dashboard)/trainer/members/[id]/_components/health-section-skeleton.tsx` | — |
| Rewrite | `src/app/(dashboard)/trainer/members/[id]/page.tsx` | bento grid shell |
| Rewrite | `__tests__/app/trainer/member-hub-page.test.ts` | updated mocks + new test cases |

---

## Task 1: Extend test file — new mocks and test cases

**Files:**
- Rewrite: `__tests__/app/trainer/member-hub-page.test.ts`

The existing test file has three `describe` blocks covering `MemberHubOverviewPage`, `StatCardsSection`, and `HealthSection`. All three need updating. We add a `MongoMemberMedicationRepository` mock, update the body test mock from `findLatestByMember` to `findByMember`, add `findRecentCompletedByMemberIds` to the session mock, and write new test cases for `StatStripSection`, `PlanCardSection`, and `HealthPanelSection`.

- [ ] **Step 1: Replace the entire test file**

Write this exact content to `__tests__/app/trainer/member-hub-page.test.ts`:

```ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findByMember: jest.fn() };
const mockSessionRepo = {
  findMemberStats: jest.fn(),
  findRecentCompletedByMemberIds: jest.fn(),
};
const mockPlanRepo = { findActive: jest.fn() };
const mockInjuryRepo = { findActiveByMember: jest.fn() };
const mockMedRepo = { findByMember: jest.fn() };

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
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Page ────────────────────────────────────────────────────────────────────

describe('MemberHubOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.findByMember.mockResolvedValue([]);
    mockSessionRepo.findMemberStats.mockResolvedValue({ completedCount: 0, lastCompletedAt: null });
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([]);
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
    mockMedRepo.findByMember.mockResolvedValue([]);
  });

  it('renders non-null JSX when authenticated', async () => {
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/page');
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/page');
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });
});

// ─── StatStripSection ─────────────────────────────────────────────────────────

describe('StatStripSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockBodyTestRepo.findByMember.mockResolvedValue([]);
    mockSessionRepo.findMemberStats.mockResolvedValue({ completedCount: 0, lastCompletedAt: null });
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([]);
  });

  it('calls findByMember, findMemberStats, and findRecentCompletedByMemberIds', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    await StatStripSection({ memberId: 'm1' });
    expect(mockBodyTestRepo.findByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findRecentCompletedByMemberIds).toHaveBeenCalledWith(['m1'], 1);
  });

  it('does not call findActive (plan moved to PlanCardSection)', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    await StatStripSection({ memberId: 'm1' });
    expect(mockPlanRepo.findActive).not.toHaveBeenCalled();
  });

  it('renders without throwing when all data is empty', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });

  it('computes weight delta when two body tests are available', async () => {
    mockBodyTestRepo.findByMember.mockResolvedValue([
      { weight: 78, bodyFatPct: 18.0 },
      { weight: 79.2, bodyFatPct: 19.1 },
    ]);
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('1.2');   // |78 - 79.2| = 1.2
  });

  it('shows last session day name when available', async () => {
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([
      { memberId: 'm1', dayName: 'Push', completedAt: new Date() },
    ]);
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Push');
  });
});

// ─── PlanCardSection ──────────────────────────────────────────────────────────

describe('PlanCardSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockPlanRepo.findActive.mockResolvedValue(null);
  });

  it('calls findActive with memberId', async () => {
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    await PlanCardSection({ memberId: 'm1' });
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('renders plan name and Log Workout when plan exists', async () => {
    mockPlanRepo.findActive.mockResolvedValue({
      _id: 'p1',
      name: 'PPL — 3-Day Split',
      days: [{ name: 'Push' }, { name: 'Pull' }, { name: 'Legs' }],
      assignedAt: new Date('2026-04-02'),
      isActive: true,
    });
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    const result = await PlanCardSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('PPL');
    expect(html).toContain('Log Workout');
  });

  it('renders empty state with Assign Plan when no plan', async () => {
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    const result = await PlanCardSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('No active training plan');
    expect(html).toContain('Assign Plan');
  });
});

// ─── HealthPanelSection ───────────────────────────────────────────────────────

describe('HealthPanelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
    mockMedRepo.findByMember.mockResolvedValue([]);
  });

  it('calls findActiveByMember and medication findByMember', async () => {
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    await HealthPanelSection({ memberId: 'm1' });
    expect(mockInjuryRepo.findActiveByMember).toHaveBeenCalledWith('m1');
    expect(mockMedRepo.findByMember).toHaveBeenCalledWith('m1');
  });

  it('renders injury title when active injury exists', async () => {
    mockInjuryRepo.findActiveByMember.mockResolvedValue([
      { _id: 'i1', title: 'Right shoulder tightness', status: 'active', affectedMovements: 'Overhead press' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Right shoulder tightness');
  });

  it('renders medication name when active medication exists', async () => {
    mockMedRepo.findByMember.mockResolvedValue([
      { _id: 'm1', name: 'Effexor', purpose: 'OCD', duration: 'long_term', startDate: new Date('2018-02-01'), status: 'active' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Effexor');
  });

  it('renders ended medications as not visible (filtered out)', async () => {
    mockMedRepo.findByMember.mockResolvedValue([
      { _id: 'm2', name: 'OldMed', purpose: 'Test', duration: 'short_term', startDate: new Date(), status: 'ended' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).not.toContain('OldMed');
  });

  it('renders No active concerns when no injuries and no active medications', async () => {
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('No active concerns');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (new components not yet implemented)**

```bash
pnpm test __tests__/app/trainer/member-hub-page.test.ts
```

Expected: multiple failures referencing missing modules `stat-strip-section`, `plan-card-section`, `health-panel-section`. The 2 existing `MemberHubOverviewPage` tests may pass or fail — either is acceptable.

---

## Task 2: StatCard — add `deltaVariant` prop

**Files:**
- Modify: `src/components/shared/stat-card.tsx`

Backward-compatible change. Existing callers without `deltaVariant` keep `text-foreground/65` delta color.

- [ ] **Step 1: Replace `stat-card.tsx` with updated version**

```tsx
'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaVariant?: 'success' | 'warning' | 'neutral';
  accentColor?: 'primary' | 'success' | 'achievement';
}

const accentMap = {
  primary:     'bg-primary/10 ring-primary/20',
  success:     'bg-emerald-500/10 ring-emerald-500/20',
  achievement: 'bg-amber-500/10 ring-amber-500/20',
} as const;

const deltaColorMap = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  neutral: 'text-foreground/50',
} as const;

export function StatCard({ label, value, unit, delta, deltaVariant, accentColor }: StatCardProps) {
  const surfaceClass = accentColor
    ? accentMap[accentColor]
    : 'bg-white/[.04] ring-white/10';

  const deltaColorClass = deltaVariant ? deltaColorMap[deltaVariant] : 'text-foreground/65';

  return (
    <div className={`rounded-xl ring-1 backdrop-blur-sm p-4 ${surfaceClass}`}>
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
        {label}
      </div>
      <motion.div
        className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums"
        variants={variants.scaleIn}
        initial="hidden"
        animate="visible"
      >
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-foreground/65">{unit}</span>
        )}
      </motion.div>
      {delta && (
        <div className={`mt-1.5 text-xs ${deltaColorClass}`}>{delta}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no errors.

---

## Task 3: StatStripSection — rename and rewrite

**Files:**
- Rename + rewrite: `src/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section.tsx` → `stat-strip-section.tsx`

Delete the old file, create the new one. Old export `StatCardsSection` is no longer used (page.tsx will be updated in Task 6).

- [ ] **Step 1: Delete the old file**

```bash
rm "src/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section.tsx"
```

- [ ] **Step 2: Create `stat-strip-section.tsx`**

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';

function formatRelativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatDelta(value: number, unit: string): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return {
    text: `${down ? '▼' : '▲'} ${abs} ${unit}`,
    variant: down ? 'success' : 'neutral',
  };
}

function formatBfDelta(value: number): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return {
    text: `${down ? '▼' : '▲'} ${abs}%`,
    variant: down ? 'success' : 'warning',
  };
}

export async function StatStripSection({ memberId }: { memberId: string }) {
  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const [tests, stats, recentSessions] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    sessionRepo.findMemberStats(memberId),
    sessionRepo.findRecentCompletedByMemberIds([memberId], 1),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;
  const lastDayName = recentSessions[0]?.dayName ?? null;

  const weightDelta = latest && previous
    ? formatDelta(latest.weight - previous.weight, 'kg')
    : null;

  const bfDelta = latest && previous
    ? formatBfDelta(latest.bodyFatPct - previous.bodyFatPct)
    : null;

  const lastSessionLabel = stats.lastCompletedAt
    ? formatRelativeDate(stats.lastCompletedAt)
    : '—';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Weight"
        value={latest ? String(latest.weight) : '—'}
        unit={latest ? 'kg' : undefined}
        delta={weightDelta?.text ?? (latest && !previous ? 'No prior test' : undefined)}
        deltaVariant={weightDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Body Fat"
        value={latest ? latest.bodyFatPct.toFixed(1) : '—'}
        unit={latest ? '%' : undefined}
        delta={bfDelta?.text ?? (latest && !previous ? 'No prior test' : undefined)}
        deltaVariant={bfDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Sessions"
        value={String(stats.completedCount)}
        delta="last 90 days"
      />
      <StatCard
        label="Last Session"
        value={lastSessionLabel}
        delta={lastDayName ?? undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the failing test cases for StatStripSection**

```bash
pnpm test __tests__/app/trainer/member-hub-page.test.ts
```

Expected: all `StatStripSection` describe block tests now pass. `PlanCardSection` and `HealthPanelSection` tests still fail (not yet implemented).

- [ ] **Step 4: Commit**

```bash
git add \
  "src/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section.tsx" \
  "src/components/shared/stat-card.tsx" \
  "__tests__/app/trainer/member-hub-page.test.ts"
git commit -m "feat(overview): add StatStripSection with body fat/weight deltas and last session day"
```

---

## Task 4: PlanCardSection — new component

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/_components/plan-card-section.tsx`

- [ ] **Step 1: Create `plan-card-section.tsx`**

```tsx
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

function formatAssignedDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export async function PlanCardSection({ memberId }: { memberId: string }) {
  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(memberId);

  const planHref = `/trainer/members/${memberId}/plan`;

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 bg-card/50 p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30 mb-1.5">
            Active Plan
          </div>
          <div className="text-sm text-foreground/40">No active training plan</div>
        </div>
        <Link
          href={planHref}
          className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          Assign Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/18 bg-primary/8 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary-light mb-2">
        Active Plan
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[17px] font-bold text-foreground leading-tight truncate">
            {plan.name}
          </div>
          <div className="text-[12px] text-foreground/45 mt-1">
            {plan.days.length} day plan
            <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
            Assigned {formatAssignedDate(plan.assignedAt)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={planHref}
            className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Log Workout
          </Link>
          <Link
            href={planHref}
            className="text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors whitespace-nowrap"
          >
            Change Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run PlanCardSection tests**

```bash
pnpm test __tests__/app/trainer/member-hub-page.test.ts
```

Expected: all `PlanCardSection` describe block tests pass. `HealthPanelSection` tests still fail.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/trainer/members/[id]/_components/plan-card-section.tsx"
git commit -m "feat(overview): add PlanCardSection with Log Workout CTA and empty state"
```

---

## Task 5: HealthPanelSection — rename and rewrite

**Files:**
- Delete: `src/app/(dashboard)/trainer/members/[id]/_components/health-section.tsx`
- Delete: `src/app/(dashboard)/trainer/members/[id]/_components/health-section-skeleton.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/_components/health-panel-section.tsx`

- [ ] **Step 1: Delete old files**

```bash
rm "src/app/(dashboard)/trainer/members/[id]/_components/health-section.tsx"
rm "src/app/(dashboard)/trainer/members/[id]/_components/health-section-skeleton.tsx"
```

- [ ] **Step 2: Create `health-panel-section.tsx`**

```tsx
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';

function formatSinceDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export async function HealthPanelSection({ memberId }: { memberId: string }) {
  await connectDB();
  const [injuries, allMeds] = await Promise.all([
    new MongoMemberInjuryRepository().findActiveByMember(memberId),
    new MongoMemberMedicationRepository().findByMember(memberId),
  ]);
  const activeMeds = allMeds.filter((m) => m.status === 'active');
  const hasContent = injuries.length > 0 || activeMeds.length > 0;

  const healthHref = `/trainer/members/${memberId}/health`;

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex flex-col gap-3 h-full">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          Health
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-4 gap-2 text-center">
          <div className="text-2xl">✓</div>
          <div className="text-[13px] font-semibold text-emerald-400">No active concerns</div>
          <div className="text-[11px] text-foreground/35">No injuries or medications on record</div>
        </div>
        <Link
          href={healthHref}
          className="text-[11px] text-primary/70 hover:text-primary transition-colors mt-auto"
        >
          View full health profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/15 bg-destructive/6 p-4 flex flex-col gap-3 h-full">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
        Health
      </div>

      {injuries.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
            Active {injuries.length === 1 ? 'Injury' : 'Injuries'}
          </div>
          {injuries.map((injury) => (
            <div
              key={String(injury._id)}
              className="rounded-lg border border-destructive/12 bg-destructive/8 px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-foreground">{injury.title}</p>
              {injury.affectedMovements && (
                <p className="text-[11px] text-foreground/45 mt-0.5">{injury.affectedMovements}</p>
              )}
              <p className="text-[11px] text-red-400 mt-1">Active</p>
            </div>
          ))}
        </div>
      )}

      {activeMeds.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
            {activeMeds.length === 1 ? 'Medication' : 'Medications'}
          </div>
          {activeMeds.map((med) => (
            <div
              key={String(med._id)}
              className="rounded-lg border border-foreground/8 bg-card/60 px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-foreground">{med.name}</p>
              <p className="text-[11px] text-foreground/45 mt-0.5">
                {med.purpose}
                <span className="mx-1 text-foreground/20" aria-hidden="true">·</span>
                {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                <span className="mx-1 text-foreground/20" aria-hidden="true">·</span>
                Since {formatSinceDate(med.startDate)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Link
        href={healthHref}
        className="text-[11px] text-primary/70 hover:text-primary transition-colors mt-auto"
      >
        View full health profile →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Run all tests — all describes should pass**

```bash
pnpm test __tests__/app/trainer/member-hub-page.test.ts
```

Expected: all test cases pass across all 4 describes.

- [ ] **Step 4: Commit**

```bash
git add \
  "src/app/(dashboard)/trainer/members/[id]/_components/health-panel-section.tsx"
git commit -m "feat(overview): add HealthPanelSection with medications and no-concern empty state"
```

---

## Task 6: page.tsx — bento grid and Suspense wiring

**Files:**
- Rewrite: `src/app/(dashboard)/trainer/members/[id]/page.tsx`

This is the final wiring step. The old `stat-cards-section` and `health-section` imports are replaced. Inline skeleton components replace the imported `StatCardsSkeleton` and `HealthSectionSkeleton`.

- [ ] **Step 1: Replace `page.tsx`**

```tsx
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { StatStripSection } from './_components/stat-strip-section';
import { PlanCardSection } from './_components/plan-card-section';
import { HealthPanelSection } from './_components/health-panel-section';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[80px] rounded-xl" />
                ))}
              </div>
            }
          >
            <StatStripSection memberId={memberId} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[88px] rounded-xl" />}>
            <PlanCardSection memberId={memberId} />
          </Suspense>
        </div>

        {/* Right column */}
        <Suspense fallback={<Skeleton className="h-[200px] rounded-xl" />}>
          <HealthPanelSection memberId={memberId} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test __tests__/app/trainer/member-hub-page.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no errors, no warnings. The deleted files (`stat-cards-section.tsx`, `health-section.tsx`, `health-section-skeleton.tsx`) are no longer imported anywhere — confirm no dangling imports.

- [ ] **Step 4: Visual check**

Dev server is running on `http://localhost:3000`. Log in as `trainer@dev.com` (password: `Dev123!`) and navigate to `http://localhost:3000/trainer/members/6a096af17825c9a7cf7a5165`.

Verify on the Overview tab:
1. Bento grid renders — no empty black void below the cards
2. Weight and Body Fat cards show delta (e.g. "▼ 1.2 kg") in emerald color
3. Last Session card shows day name ("Push", "Pull", etc.) in the sub-line
4. Plan card shows plan name + Log Workout button + Change Plan link
5. Health panel (right) shows the active shoulder injury + Effexor medication
6. "View full health profile →" link is visible at the bottom of Health panel
7. Resize to mobile width (375px): layout collapses to single column, stat strip becomes 2×2 grid

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/trainer/members/[id]/page.tsx"
git commit -m "feat(overview): wire bento grid — StatStrip, PlanCard, HealthPanel with Suspense"
```

---

## Self-Review

**Spec coverage:**
- ✅ No empty void — bento grid fills viewport (Task 6)
- ✅ Weight delta, BF delta with color-coding (Task 3)
- ✅ Last session day name sub-line (Task 3)
- ✅ Plan card: name, days count, assigned date, Log Workout, Change Plan (Task 4)
- ✅ Plan card empty state: "No active training plan" + Assign Plan (Task 4)
- ✅ Health panel: active injuries with title + affected movements (Task 5)
- ✅ Health panel: active medications with name + purpose + duration + since date (Task 5)
- ✅ Health panel: ended medications filtered out (Task 5 + test)
- ✅ Health panel green empty state "No active concerns" (Task 5)
- ✅ "View full health profile →" link to Health tab (Task 5)
- ✅ Mobile 2×2 stat grid (`grid-cols-2 sm:grid-cols-4`) (Task 6)
- ✅ `pnpm lint` gate (Tasks 2, 3, 6)
- ✅ `pnpm test` gate (Tasks 3, 4, 5, 6)

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `StatStripSection` calls `findByMember` (returns `IBodyTest[]`) → `tests[0]`, `tests[1]` are `IBodyTest | undefined`
- `PlanCardSection` calls `findActive` (returns `IMemberPlan | null`) → `plan.days.length`, `plan.assignedAt`, `plan.name` all on `IMemberPlan`
- `HealthPanelSection` calls `findByMember` on medication repo (returns `IMemberMedication[]`) → filters by `m.status === 'active'`; accesses `med.name`, `med.purpose`, `med.duration`, `med.startDate` — all on `IMemberMedication`
- `StatCard` new prop `deltaVariant?: 'success' | 'warning' | 'neutral'` — used in Task 3 with values `'success'` and `'neutral'` only (warning reserved for BF up case)
