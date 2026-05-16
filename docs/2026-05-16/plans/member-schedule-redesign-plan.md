# Member Schedule Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the member My Schedule page from a flat list into a Timeline Feed — a Hero card showing the next session, a vertical dot timeline of upcoming sessions, and a collapsible history section.

**Architecture:** Four focused components (`MemberScheduleHero`, `MemberScheduleTimeline`, `MemberScheduleHistory`, refactored `MemberScheduleList` shell) share a `SessionDto` type from a local `types.ts` file. `page.tsx` handles all data fetching; components are purely presentational. `MemberScheduleHistory` uses `useState` and is the only client component; the others are server components used inside the existing client shell.

**Tech Stack:** Next.js App Router, React, TailwindCSS, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(dashboard)/member/schedule/_components/types.ts` | Create | Shared `SessionDto` interface |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-hero.tsx` | Create | Hero card + `daysUntil` helper |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-timeline.tsx` | Create | Vertical dot timeline of upcoming sessions |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-history.tsx` | Create | Collapsible history section |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx` | Replace | Shell composing the three new components |
| `src/app/(dashboard)/member/schedule/page.tsx` | Modify | Sort history newest-first |
| `__tests__/app/member/schedule/member-schedule-hero.test.tsx` | Create | Tests for hero + daysUntil |
| `__tests__/app/member/schedule/member-schedule-timeline.test.tsx` | Create | Tests for timeline |
| `__tests__/app/member/schedule/member-schedule-history.test.tsx` | Create | Tests for history toggle |

---

## Task 1: Shared types + `daysUntil` helper

**Files:**
- Create: `src/app/(dashboard)/member/schedule/_components/types.ts`
- Create: `src/app/(dashboard)/member/schedule/_components/member-schedule-hero.tsx`
- Create: `__tests__/app/member/schedule/member-schedule-hero.test.tsx`

- [ ] **Step 1.1: Create the shared types file**

```ts
// src/app/(dashboard)/member/schedule/_components/types.ts
export interface SessionDto {
  _id: string;
  date: string;       // ISO string
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  trainerName: string;
  memberCount: number;
  status: 'scheduled' | 'cancelled';
  isRecurring: boolean;
}
```

- [ ] **Step 1.2: Write the failing test for `daysUntil`**

```ts
// __tests__/app/member/schedule/member-schedule-hero.test.tsx
import { render, screen } from '@testing-library/react';
import { MemberScheduleHero, daysUntil } from '@/app/(dashboard)/member/schedule/_components/member-schedule-hero';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const TODAY = new Date('2026-05-20T10:00:00');

const makeSession = (overrides: Partial<SessionDto> = {}): SessionDto => ({
  _id: 's1',
  date: '2026-05-22T00:00:00.000Z',
  startTime: '07:30',
  endTime: '08:30',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status: 'scheduled',
  isRecurring: false,
  ...overrides,
});

describe('daysUntil', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterEach(() => jest.useRealTimers());

  it('returns 0 when session is today', () => {
    expect(daysUntil('2026-05-20T00:00:00.000Z')).toBe(0);
  });

  it('returns 2 when session is 2 days away', () => {
    expect(daysUntil('2026-05-22T00:00:00.000Z')).toBe(2);
  });

  it('returns 1 when session is tomorrow', () => {
    expect(daysUntil('2026-05-21T00:00:00.000Z')).toBe(1);
  });
});

describe('MemberScheduleHero', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterEach(() => jest.useRealTimers());

  it('renders EmptyState when session is null', () => {
    render(<MemberScheduleHero session={null} />);
    expect(screen.getByText(/no upcoming sessions/i)).toBeInTheDocument();
  });

  it('renders date, time and trainer for a future session', () => {
    render(<MemberScheduleHero session={makeSession()} />);
    expect(screen.getByText(/Thu, May 22/i)).toBeInTheDocument();
    expect(screen.getByText(/07:30 – 08:30/)).toBeInTheDocument();
    expect(screen.getByText(/Coach Mike/)).toBeInTheDocument();
  });

  it('shows "还有 N 天" badge for a future session', () => {
    render(<MemberScheduleHero session={makeSession()} />);
    expect(screen.getByText('还有 2 天')).toBeInTheDocument();
    expect(screen.getByText('下一次课')).toBeInTheDocument();
  });

  it('shows "今天" badge when session is today', () => {
    render(<MemberScheduleHero session={makeSession({ date: '2026-05-20T00:00:00.000Z' })} />);
    expect(screen.getByText('今天')).toBeInTheDocument();
    expect(screen.getByText('今天的课')).toBeInTheDocument();
  });

  it('shows "1-on-1" for memberCount 1', () => {
    render(<MemberScheduleHero session={makeSession({ memberCount: 1 })} />);
    expect(screen.getByText(/1-on-1/)).toBeInTheDocument();
  });

  it('shows "Group (4)" for memberCount 4', () => {
    render(<MemberScheduleHero session={makeSession({ memberCount: 4 })} />);
    expect(screen.getByText(/Group \(4\)/)).toBeInTheDocument();
  });

  it('shows recurring badge when isRecurring is true', () => {
    render(<MemberScheduleHero session={makeSession({ isRecurring: true })} />);
    expect(screen.getByText(/↺/)).toBeInTheDocument();
  });

  it('does not show recurring badge when isRecurring is false', () => {
    render(<MemberScheduleHero session={makeSession({ isRecurring: false })} />);
    expect(screen.queryByText(/↺/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 1.3: Run the test and confirm it fails**

```bash
pnpm test -- --testPathPattern="member-schedule-hero" --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/(dashboard)/member/schedule/_components/member-schedule-hero'`

- [ ] **Step 1.4: Implement `MemberScheduleHero` with `daysUntil`**

```tsx
// src/app/(dashboard)/member/schedule/_components/member-schedule-hero.tsx
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import type { SessionDto } from './types';

export function daysUntil(isoDate: string): number {
  const d = new Date(isoDate);
  const sessionMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((sessionMidnight.getTime() - todayMidnight.getTime()) / 86400000);
}

interface Props {
  session: SessionDto | null;
}

export function MemberScheduleHero({ session }: Props) {
  if (!session) {
    return (
      <EmptyState
        heading="No upcoming sessions"
        description="Your trainer hasn't scheduled any sessions yet."
      />
    );
  }

  const days = daysUntil(session.date);
  const isToday = days === 0;
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const groupLabel = session.memberCount > 1 ? `Group (${session.memberCount})` : '1-on-1';

  return (
    <div
      className={cn(
        'rounded-xl p-4 bg-primary/[.07]',
        isToday ? 'ring-1 ring-primary/40' : 'ring-1 ring-primary/[.16]',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">
          {isToday ? '今天的课' : '下一次课'}
        </span>
        <span
          className={cn(
            'text-[11px] rounded px-2 py-0.5',
            isToday
              ? 'bg-primary/[.20] text-primary-light font-semibold'
              : 'bg-primary/[.12] text-primary-light',
          )}
        >
          {isToday ? '今天' : `还有 ${days} 天`}
        </span>
      </div>
      <div className="text-[18px] font-bold text-foreground">{dateLabel}</div>
      <div className="text-[13px] text-foreground/65 mt-1">
        {session.startTime} – {session.endTime}
      </div>
      <div className="text-[12px] text-foreground/65 mt-1">
        {session.trainerName} · {groupLabel}
      </div>
      {session.isRecurring && (
        <span className="inline-block mt-3 text-[10px] bg-primary/[.12] text-primary-light rounded px-2 py-0.5 border border-primary/[.16]">
          ↺ 每周固定
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 1.5: Run tests and confirm they pass**

```bash
pnpm test -- --testPathPattern="member-schedule-hero" --no-coverage
```

Expected: PASS — all 8 tests

- [ ] **Step 1.6: Commit**

```bash
git add src/app/\(dashboard\)/member/schedule/_components/types.ts \
        src/app/\(dashboard\)/member/schedule/_components/member-schedule-hero.tsx \
        __tests__/app/member/schedule/member-schedule-hero.test.tsx
git commit -m "feat(member-schedule): add SessionDto types, MemberScheduleHero, daysUntil helper"
```

---

## Task 2: `MemberScheduleTimeline` component

**Files:**
- Create: `src/app/(dashboard)/member/schedule/_components/member-schedule-timeline.tsx`
- Create: `__tests__/app/member/schedule/member-schedule-timeline.test.tsx`

- [ ] **Step 2.1: Write the failing test**

```tsx
// __tests__/app/member/schedule/member-schedule-timeline.test.tsx
import { render, screen } from '@testing-library/react';
import { MemberScheduleTimeline } from '@/app/(dashboard)/member/schedule/_components/member-schedule-timeline';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const makeSession = (id: string, date: string): SessionDto => ({
  _id: id,
  date,
  startTime: '09:00',
  endTime: '10:00',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status: 'scheduled',
  isRecurring: false,
});

describe('MemberScheduleTimeline', () => {
  it('renders nothing when sessions is empty', () => {
    const { container } = render(
      <MemberScheduleTimeline sessions={[]} heroIsToday={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "即将到来" when heroIsToday is false', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', '2026-05-24T00:00:00.000Z')]}
        heroIsToday={false}
      />,
    );
    expect(screen.getByText('即将到来')).toBeInTheDocument();
  });

  it('shows "接下来" when heroIsToday is true', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', '2026-05-24T00:00:00.000Z')]}
        heroIsToday={true}
      />,
    );
    expect(screen.getByText('接下来')).toBeInTheDocument();
  });

  it('renders each session date and time', () => {
    render(
      <MemberScheduleTimeline
        sessions={[
          makeSession('s1', '2026-05-24T00:00:00.000Z'),
          makeSession('s2', '2026-05-29T00:00:00.000Z'),
        ]}
        heroIsToday={false}
      />,
    );
    expect(screen.getByText(/Sat, May 24/i)).toBeInTheDocument();
    expect(screen.getByText(/Thu, May 29/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2.2: Run the test and confirm it fails**

```bash
pnpm test -- --testPathPattern="member-schedule-timeline" --no-coverage
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 2.3: Implement `MemberScheduleTimeline`**

```tsx
// src/app/(dashboard)/member/schedule/_components/member-schedule-timeline.tsx
import { cn } from '@/lib/utils';
import type { SessionDto } from './types';

interface Props {
  sessions: SessionDto[];
  heroIsToday: boolean;
}

export function MemberScheduleTimeline({ sessions, heroIsToday }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
        {heroIsToday ? '接下来' : '即将到来'}
      </div>
      <div>
        {sessions.map((s, i) => {
          const d = new Date(s.date);
          const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const isLast = i === sessions.length - 1;
          return (
            <div key={s._id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center mt-1.5">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    isLast && sessions.length > 1 ? 'bg-primary/50' : 'bg-primary',
                  )}
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-foreground/[.05] mt-1 min-h-[18px]" />
                )}
              </div>
              <div className="pb-3">
                <div className="text-[13px] font-semibold text-foreground">{label}</div>
                <div className="text-[11px] text-foreground/65">
                  {s.startTime} – {s.endTime} · {s.trainerName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests and confirm they pass**

```bash
pnpm test -- --testPathPattern="member-schedule-timeline" --no-coverage
```

Expected: PASS — all 4 tests

- [ ] **Step 2.5: Commit**

```bash
git add src/app/\(dashboard\)/member/schedule/_components/member-schedule-timeline.tsx \
        __tests__/app/member/schedule/member-schedule-timeline.test.tsx
git commit -m "feat(member-schedule): add MemberScheduleTimeline component"
```

---

## Task 3: `MemberScheduleHistory` component

**Files:**
- Create: `src/app/(dashboard)/member/schedule/_components/member-schedule-history.tsx`
- Create: `__tests__/app/member/schedule/member-schedule-history.test.tsx`

- [ ] **Step 3.1: Write the failing test**

```tsx
// __tests__/app/member/schedule/member-schedule-history.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemberScheduleHistory } from '@/app/(dashboard)/member/schedule/_components/member-schedule-history';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const makeSession = (id: string, status: 'scheduled' | 'cancelled' = 'scheduled'): SessionDto => ({
  _id: id,
  date: '2026-05-15T00:00:00.000Z',
  startTime: '07:30',
  endTime: '08:30',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status,
  isRecurring: false,
});

describe('MemberScheduleHistory', () => {
  it('renders nothing when sessions is empty', () => {
    const { container } = render(<MemberScheduleHistory sessions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows toggle button with count', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1'), makeSession('s2')]} />);
    expect(screen.getByText(/历史记录（2 条）/)).toBeInTheDocument();
  });

  it('is collapsed by default — sessions not visible', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    expect(screen.queryByText(/May 15/)).not.toBeInTheDocument();
  });

  it('expands when toggle is clicked', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    fireEvent.click(screen.getByText(/历史记录（1 条）/));
    expect(screen.getByText(/Thu, May 15/i)).toBeInTheDocument();
  });

  it('collapses again on second click', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    const toggle = screen.getByText(/历史记录（1 条）/);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText(/隐藏历史记录/));
    expect(screen.queryByText(/May 15/)).not.toBeInTheDocument();
  });

  it('shows "已取消" for cancelled sessions when expanded', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1', 'cancelled')]} />);
    fireEvent.click(screen.getByText(/历史记录（1 条）/));
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('starts expanded when defaultOpen is true', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} defaultOpen />);
    expect(screen.getByText(/Thu, May 15/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run the test and confirm it fails**

```bash
pnpm test -- --testPathPattern="member-schedule-history" --no-coverage
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3.3: Implement `MemberScheduleHistory`**

```tsx
// src/app/(dashboard)/member/schedule/_components/member-schedule-history.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SessionDto } from './types';

interface Props {
  sessions: SessionDto[];
  defaultOpen?: boolean;
}

export function MemberScheduleHistory({ sessions, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (sessions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-foreground/[.06]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer"
      >
        {open ? '▾ 隐藏历史记录' : `▸ 历史记录（${sessions.length} 条）`}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {sessions.map((s) => {
            const d = new Date(s.date);
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const isCancelled = s.status === 'cancelled';
            return (
              <div key={s._id} className="flex gap-3 items-start opacity-50">
                <div className="mt-1.5 shrink-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isCancelled ? 'bg-destructive/30' : 'bg-foreground/30',
                    )}
                  />
                </div>
                <div>
                  <div className="text-[13px] text-foreground">{label}</div>
                  <div
                    className={cn(
                      'text-[11px]',
                      isCancelled ? 'text-destructive/60' : 'text-foreground/65',
                    )}
                  >
                    {isCancelled
                      ? '已取消'
                      : `${s.startTime} – ${s.endTime} · ${s.trainerName}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3.4: Run tests and confirm they pass**

```bash
pnpm test -- --testPathPattern="member-schedule-history" --no-coverage
```

Expected: PASS — all 7 tests

- [ ] **Step 3.5: Commit**

```bash
git add src/app/\(dashboard\)/member/schedule/_components/member-schedule-history.tsx \
        __tests__/app/member/schedule/member-schedule-history.test.tsx
git commit -m "feat(member-schedule): add MemberScheduleHistory component"
```

---

## Task 4: Refactor `MemberScheduleList` + update `page.tsx`

No new tests needed here — the three components are already covered. Run the full suite to confirm nothing regresses.

**Files:**
- Replace: `src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx`
- Modify: `src/app/(dashboard)/member/schedule/page.tsx`

- [ ] **Step 4.1: Replace `MemberScheduleList` with the shell component**

Overwrite the entire file:

```tsx
// src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx
'use client';

import type { SessionDto } from './types';
import { MemberScheduleHero, daysUntil } from './member-schedule-hero';
import { MemberScheduleTimeline } from './member-schedule-timeline';
import { MemberScheduleHistory } from './member-schedule-history';

interface Props {
  upcoming: SessionDto[];
  history: SessionDto[];
}

export function MemberScheduleList({ upcoming, history }: Props) {
  const hero = upcoming[0] ?? null;
  const timeline = upcoming.slice(1);
  const heroIsToday = hero ? daysUntil(hero.date) === 0 : false;

  return (
    <div className="px-4 sm:px-8 py-6 space-y-5">
      <MemberScheduleHero session={hero} />
      <MemberScheduleTimeline sessions={timeline} heroIsToday={heroIsToday} />
      <MemberScheduleHistory sessions={history} defaultOpen={!hero} />
    </div>
  );
}
```

- [ ] **Step 4.2: Update `page.tsx` — sort history newest-first**

In `src/app/(dashboard)/member/schedule/page.tsx`, change the history filter line from:

```ts
const history = all.filter((s) => s.date < now || s.status === 'cancelled');
```

to:

```ts
const history = all
  .filter((s) => s.date < now || s.status === 'cancelled')
  .reverse();
```

(`all` is already sorted date ascending from the repo, so `.reverse()` gives newest-first for history.)

- [ ] **Step 4.3: Run the full test suite**

```bash
pnpm test --no-coverage
```

Expected: all existing tests pass + the 19 new tests pass

- [ ] **Step 4.4: Run lint**

```bash
pnpm lint
```

Expected: no errors or warnings

- [ ] **Step 4.5: Commit**

```bash
git add src/app/\(dashboard\)/member/schedule/_components/member-schedule-list.tsx \
        src/app/\(dashboard\)/member/schedule/page.tsx
git commit -m "feat(member-schedule): refactor to Timeline Feed layout — Hero, Timeline, History"
```

---

## Done

After Task 4, the redesign is complete. Verify in the browser at `http://localhost:3000/member/schedule`.

**Checklist:**
- [ ] Future session: hero shows "下一次课" label + "还有 N 天" badge, indigo border
- [ ] Today's session: hero shows "今天的课" + "今天" badge, deeper border
- [ ] No upcoming sessions: EmptyState replaces hero, history auto-expands
- [ ] Recurring sessions show ↺ badge
- [ ] Group sessions show "Group (N)"
- [ ] History collapsed by default, toggle works, cancelled items show "已取消" in red
- [ ] `pnpm build` passes clean
