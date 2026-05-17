# Journey Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the member Journey page (`/member/journey`) — a paginated timeline of body tests with check-in photos and highlighted milestone cards.

**Architecture:** A new dedicated API route (`GET /api/members/[memberId]/journey`) fetches full body test history, evaluates five milestone triggers server-side, and matches the nearest check-in photo per test. The client renders a B+C timeline (left flex spine + compact nodes + full-width milestone cards) with IntersectionObserver-based lazy loading.

**Tech Stack:** Next.js App Router, TypeScript, Mongoose, Tailwind CSS, shadcn/ui, React hooks, Jest + React Testing Library

---

## File Map

| Status | File | Purpose |
|---|---|---|
| CREATE | `src/lib/types/journey.ts` | Shared TypeScript interfaces for API and UI |
| CREATE | `src/lib/journey/milestone-calculator.ts` | Pure milestone trigger logic |
| CREATE | `src/lib/journey/photo-matcher.ts` | Pure check-in photo matching logic |
| MODIFY | `src/lib/repositories/body-test.repository.ts` | Add `findAllByMemberAscending` |
| MODIFY | `src/lib/repositories/check-in.repository.ts` | Add `findPhotosForMember` |
| CREATE | `src/app/api/members/[memberId]/journey/route.ts` | GET endpoint |
| MODIFY | `src/components/shared/app-shell.tsx` | Add 旅程 nav item |
| CREATE | `src/app/(dashboard)/member/journey/page.tsx` | Server page (auth + shell) |
| CREATE | `src/app/(dashboard)/member/journey/_components/journey-header.tsx` | Header stats card |
| CREATE | `src/app/(dashboard)/member/journey/_components/timeline-node.tsx` | Regular compact node |
| CREATE | `src/app/(dashboard)/member/journey/_components/milestone-card.tsx` | Full-width milestone card |
| CREATE | `src/app/(dashboard)/member/journey/_components/journey-client.tsx` | Timeline + lazy load |
| CREATE | `__tests__/lib/journey/milestone-calculator.test.ts` | Unit tests |
| CREATE | `__tests__/lib/journey/photo-matcher.test.ts` | Unit tests |
| CREATE | `__tests__/app/api/members/journey-route.test.ts` | API route tests |

---

## Task 1: TypeScript Types

**Files:**
- Create: `src/lib/types/journey.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/types/journey.ts

export interface JourneySummary {
  totalTests: number;
  firstTestDate: string;       // ISO string
  firstBodyFatPct: number;
  firstWeight: number;
  firstLeanMassKg: number;
  latestBodyFatPct: number;
  latestWeight: number;
  latestLeanMassKg: number;
  leanMassDeltaKg: number;     // latestLeanMassKg - firstLeanMassKg
}

export type MilestoneTagColor = 'gold' | 'green' | 'indigo';

export interface MilestoneTag {
  label: string;
  color: MilestoneTagColor;
}

export interface MilestoneInfo {
  emoji: string;
  title: string;
  tags: MilestoneTag[];
  photos: string[];            // up to 3 check-in photo URLs
}

export interface JourneyBodyTest {
  id: string;
  date: string;                // ISO string
  testNumber: number;          // 1-indexed, ascending by date
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;   // vs previous test; null for first test
  deltaWeight: number | null;
}

export interface JourneyItem {
  bodyTest: JourneyBodyTest;
  checkInPhoto: string | null; // URL of nearest check-in photo within ±14 days
  milestone: MilestoneInfo | null;
}

export interface JourneyResponse {
  items: JourneyItem[];
  nextCursor: string | null;   // ISO date string; null when no more pages
  summary: JourneySummary | null;  // null only when totalTests === 0
}
```

- [ ] **Step 2: Run lint to confirm no errors**

```bash
pnpm lint
```

Expected: no errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/journey.ts
git commit -m "feat(journey): add TypeScript interfaces for Journey API"
```

---

## Task 2: Milestone Calculator

**Files:**
- Create: `src/lib/journey/milestone-calculator.ts`
- Test: `__tests__/lib/journey/milestone-calculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/journey/milestone-calculator.test.ts
import {
  evaluateMilestone,
  selectEmoji,
  buildMilestoneTitle,
  type BodyTestSnapshot,
} from '@/lib/journey/milestone-calculator';

function makeTest(overrides: Partial<BodyTestSnapshot> = {}): BodyTestSnapshot {
  return {
    date: new Date('2024-01-01'),
    bodyFatPct: 22.0,
    weight: 75.0,
    leanMassKg: 58.5,
    targetBodyFatPct: null,
    targetWeight: null,
    ...overrides,
  };
}

const NO_CHECKINS: Date[] = [];

describe('evaluateMilestone', () => {
  it('returns time_milestone trigger for the very first test (index 0)', () => {
    const tests = [makeTest()];
    const triggers = evaluateMilestone(0, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('time_milestone');
  });

  it('returns no triggers for a second test with no notable changes', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 22.0, weight: 75.0, leanMassKg: 58.5 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 21.8, weight: 74.9, leanMassKg: 58.6 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers).toHaveLength(0);
  });

  it('returns significant_change when body fat drops >= 1%', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 21.9 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('significant_change');
  });

  it('does NOT return significant_change when drop is < 1%', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 22.5 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 21.6 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('significant_change');
  });

  it('returns personal_best when new lowest body fat % is achieved', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, leanMassKg: 57.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 22.5, leanMassKg: 58.0 }),
      makeTest({ date: new Date('2024-03-01'), bodyFatPct: 22.0, leanMassKg: 58.5 }),
    ];
    const triggers = evaluateMilestone(2, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('personal_best');
  });

  it('does NOT return personal_best when body fat is not the lowest ever', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 21.0, leanMassKg: 59.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 22.5, leanMassKg: 58.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('personal_best');
  });

  it('returns goal_reached when bodyFatPct <= targetBodyFatPct for the first time', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('goal_reached');
  });

  it('does NOT return goal_reached if a previous test already reached the goal', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 19.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('goal_reached');
  });

  it('returns time_milestone for test near 3-month anniversary', () => {
    const first = new Date('2024-01-01');
    const threeMonths = new Date('2024-04-03'); // within ±7 days of Apr 1
    const tests = [
      makeTest({ date: first }),
      makeTest({ date: threeMonths }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('time_milestone');
  });

  it('does NOT return time_milestone when test is more than 7 days away from anniversary', () => {
    const first = new Date('2024-01-01');
    const notAnniversary = new Date('2024-04-15'); // 14 days after 3-month mark
    const tests = [
      makeTest({ date: first }),
      makeTest({ date: notAnniversary }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('time_milestone');
  });

  it('returns checkin_streak when 30th check-in date is within ±7 days of test', () => {
    const testDate = new Date('2024-03-01');
    const checkInDates: Date[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i * 3);
      return d;
    });
    // 30th check-in is at index 29
    checkInDates[29] = new Date('2024-03-03'); // 2 days after test — within 7 days
    const tests = [makeTest({ date: testDate })];
    const triggers = evaluateMilestone(0, tests, checkInDates.sort((a, b) => a.getTime() - b.getTime()));
    expect(triggers.map(t => t.type)).toContain('checkin_streak');
  });

  it('returns multiple triggers when several conditions fire simultaneously', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, leanMassKg: 57.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, leanMassKg: 59.0, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    const types = triggers.map(t => t.type);
    expect(types).toContain('goal_reached');
    expect(types).toContain('personal_best');
    expect(types).toContain('significant_change');
  });
});

describe('selectEmoji', () => {
  it('returns 🏆 when goal_reached is present', () => {
    expect(selectEmoji([{ type: 'goal_reached', label: '', color: 'gold' }])).toBe('🏆');
  });
  it('returns 🌟 when time_milestone is present (no goal_reached)', () => {
    expect(selectEmoji([{ type: 'time_milestone', label: '', color: 'indigo' }])).toBe('🌟');
  });
  it('returns 🥇 for personal_best only', () => {
    expect(selectEmoji([{ type: 'personal_best', label: '', color: 'indigo' }])).toBe('🥇');
  });
});

describe('buildMilestoneTitle', () => {
  it('returns goal title when goal_reached present', () => {
    const title = buildMilestoneTitle([{ type: 'goal_reached', label: '目标达成', color: 'gold' }]);
    expect(title).toBe('达成目标');
  });
  it('uses label for time_milestone', () => {
    const title = buildMilestoneTitle([{ type: 'time_milestone', label: '3个月里程碑', color: 'indigo' }]);
    expect(title).toBe('3个月里程碑');
  });
});
```

- [ ] **Step 2: Run tests — confirm they all fail (module not found)**

```bash
pnpm test -- --testPathPattern="milestone-calculator" --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/journey/milestone-calculator'`

- [ ] **Step 3: Implement the milestone calculator**

```typescript
// src/lib/journey/milestone-calculator.ts
import type { MilestoneTag } from '@/lib/types/journey';

export interface BodyTestSnapshot {
  date: Date;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  targetBodyFatPct: number | null;
  targetWeight: number | null;
}

export interface MilestoneTrigger {
  type: 'goal_reached' | 'significant_change' | 'personal_best' | 'time_milestone' | 'checkin_streak';
  label: string;
  color: MilestoneTag['color'];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
const FOURTEEN_DAYS_MS = 14 * MS_PER_DAY;
const TIME_ANNIVERSARIES_MONTHS = [3, 6, 12];
const STREAK_THRESHOLDS = [30, 60, 100];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function evaluateMilestone(
  index: number,
  tests: BodyTestSnapshot[],
  checkInDates: Date[],         // all check-in dates, sorted ascending
): MilestoneTrigger[] {
  const triggers: MilestoneTrigger[] = [];
  const test = tests[index];
  const prev = index > 0 ? tests[index - 1] : null;
  const earlier = tests.slice(0, index);

  // ── Time milestone ──────────────────────────────────────────
  if (index === 0) {
    triggers.push({ type: 'time_milestone', label: '开始旅程', color: 'indigo' });
  } else {
    const firstDate = tests[0].date;
    for (const months of TIME_ANNIVERSARIES_MONTHS) {
      const anniversary = addMonths(firstDate, months);
      if (Math.abs(test.date.getTime() - anniversary.getTime()) <= SEVEN_DAYS_MS) {
        triggers.push({ type: 'time_milestone', label: `${months === 12 ? '1年' : `${months}个月`}里程碑`, color: 'indigo' });
        break;
      }
    }
  }

  // ── Goal reached ────────────────────────────────────────────
  if (test.targetBodyFatPct !== null && test.bodyFatPct <= test.targetBodyFatPct) {
    const alreadyReached = earlier.some(
      t => t.targetBodyFatPct !== null && t.bodyFatPct <= t.targetBodyFatPct,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 目标体脂达成', color: 'gold' });
    }
  }
  if (test.targetWeight !== null && test.weight <= test.targetWeight) {
    const alreadyReached = earlier.some(
      t => t.targetWeight !== null && t.weight <= t.targetWeight,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 目标体重达成', color: 'gold' });
    }
  }

  // ── Significant change ──────────────────────────────────────
  if (prev) {
    if (prev.bodyFatPct - test.bodyFatPct >= 1.0) {
      triggers.push({ type: 'significant_change', label: `⬇ 体脂 −${(prev.bodyFatPct - test.bodyFatPct).toFixed(1)}%`, color: 'green' });
    }
    if (Math.abs(test.weight - prev.weight) >= 2.0) {
      triggers.push({ type: 'significant_change', label: `体重变化 ${Math.abs(test.weight - prev.weight).toFixed(1)} kg`, color: 'green' });
    }
  }

  // ── Personal best ───────────────────────────────────────────
  const lowestBf = earlier.length > 0 ? Math.min(...earlier.map(t => t.bodyFatPct)) : Infinity;
  if (test.bodyFatPct < lowestBf) {
    triggers.push({ type: 'personal_best', label: '🥇 个人最低体脂', color: 'indigo' });
  }
  const highestLean = earlier.length > 0 ? Math.max(...earlier.map(t => t.leanMassKg)) : -Infinity;
  if (test.leanMassKg > highestLean) {
    triggers.push({ type: 'personal_best', label: '🏅 最高瘦体质量', color: 'indigo' });
  }

  // ── Check-in streak ─────────────────────────────────────────
  const streakDates = STREAK_THRESHOLDS
    .filter(n => checkInDates.length >= n)
    .map(n => ({ count: n, date: checkInDates[n - 1] }));
  const matchingStreak = streakDates
    .filter(({ date }) => Math.abs(date.getTime() - test.date.getTime()) <= SEVEN_DAYS_MS)
    .sort((a, b) => b.count - a.count)[0]; // highest threshold wins
  if (matchingStreak) {
    triggers.push({ type: 'checkin_streak', label: `✅ ${matchingStreak.count}次打卡达成`, color: 'green' });
  }

  return triggers;
}

const EMOJI_PRIORITY: MilestoneTrigger['type'][] = [
  'goal_reached', 'time_milestone', 'personal_best', 'significant_change', 'checkin_streak',
];

export function selectEmoji(triggers: MilestoneTrigger[]): string {
  const map: Record<MilestoneTrigger['type'], string> = {
    goal_reached: '🏆',
    time_milestone: '🌟',
    personal_best: '🥇',
    significant_change: '⬇️',
    checkin_streak: '✅',
  };
  const top = EMOJI_PRIORITY.find(p => triggers.some(t => t.type === p));
  return top ? map[top] : '⭐';
}

export function buildMilestoneTitle(triggers: MilestoneTrigger[]): string {
  const top = EMOJI_PRIORITY.find(p => triggers.some(t => t.type === p));
  switch (top) {
    case 'goal_reached': return '达成目标';
    case 'time_milestone': return triggers.find(t => t.type === 'time_milestone')!.label;
    case 'personal_best': return '创下个人纪录';
    case 'significant_change': return '显著进步';
    case 'checkin_streak': return triggers.find(t => t.type === 'checkin_streak')!.label;
    default: return '里程碑时刻';
  }
}
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
pnpm test -- --testPathPattern="milestone-calculator" --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/journey/milestone-calculator.ts __tests__/lib/journey/milestone-calculator.test.ts
git commit -m "feat(journey): add milestone calculator with full trigger logic"
```

---

## Task 3: Photo Matcher

**Files:**
- Create: `src/lib/journey/photo-matcher.ts`
- Test: `__tests__/lib/journey/photo-matcher.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/journey/photo-matcher.test.ts
import { findNearestPhoto, findPhotosNear, type CheckInPhotoEntry } from '@/lib/journey/photo-matcher';

const testDate = new Date('2024-03-01');

describe('findNearestPhoto', () => {
  it('returns null when no check-ins', () => {
    expect(findNearestPhoto(testDate, [])).toBeNull();
  });

  it('returns null when all check-ins are outside ±14 days', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-01-10'), photos: ['a.jpg'] },
      { submittedAt: new Date('2024-04-20'), photos: ['b.jpg'] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBeNull();
  });

  it('returns null when check-in within window has no photos', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-05'), photos: [] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBeNull();
  });

  it('returns the first photo of the nearest check-in within ±14 days', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-03'), photos: ['near.jpg', 'near2.jpg'] },
      { submittedAt: new Date('2024-03-08'), photos: ['far.jpg'] },
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBe('near.jpg');
  });

  it('returns the closest photo when multiple candidates exist', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-02-20'), photos: ['behind.jpg'] }, // 10 days before
      { submittedAt: new Date('2024-03-04'), photos: ['ahead.jpg'] },  // 3 days after
    ];
    expect(findNearestPhoto(testDate, checkIns)).toBe('ahead.jpg');
  });
});

describe('findPhotosNear', () => {
  it('returns empty array when no check-ins with photos in window', () => {
    expect(findPhotosNear(testDate, [], 3)).toEqual([]);
  });

  it('returns up to max photos ordered by proximity', () => {
    const checkIns: CheckInPhotoEntry[] = [
      { submittedAt: new Date('2024-03-10'), photos: ['c.jpg'] }, // 9 days after
      { submittedAt: new Date('2024-03-02'), photos: ['a.jpg'] }, // 1 day after
      { submittedAt: new Date('2024-02-28'), photos: ['b.jpg'] }, // 2 days before
    ];
    const result = findPhotosNear(testDate, checkIns, 3);
    expect(result).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('respects max limit', () => {
    const checkIns: CheckInPhotoEntry[] = Array.from({ length: 5 }, (_, i) => ({
      submittedAt: new Date(testDate.getTime() + i * 24 * 60 * 60 * 1000),
      photos: [`photo${i}.jpg`],
    }));
    expect(findPhotosNear(testDate, checkIns, 3)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (module not found)**

```bash
pnpm test -- --testPathPattern="photo-matcher" --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/journey/photo-matcher'`

- [ ] **Step 3: Implement the photo matcher**

```typescript
// src/lib/journey/photo-matcher.ts

export interface CheckInPhotoEntry {
  submittedAt: Date;
  photos: string[];
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function findNearestPhoto(
  testDate: Date,
  checkIns: CheckInPhotoEntry[],
): string | null {
  const candidates = checkIns
    .filter(c => c.photos.length > 0 && Math.abs(c.submittedAt.getTime() - testDate.getTime()) <= FOURTEEN_DAYS_MS)
    .sort((a, b) => Math.abs(a.submittedAt.getTime() - testDate.getTime()) - Math.abs(b.submittedAt.getTime() - testDate.getTime()));
  return candidates[0]?.photos[0] ?? null;
}

export function findPhotosNear(
  testDate: Date,
  checkIns: CheckInPhotoEntry[],
  max: number,
): string[] {
  const photos: string[] = checkIns
    .filter(c => c.photos.length > 0 && Math.abs(c.submittedAt.getTime() - testDate.getTime()) <= FOURTEEN_DAYS_MS)
    .sort((a, b) => Math.abs(a.submittedAt.getTime() - testDate.getTime()) - Math.abs(b.submittedAt.getTime() - testDate.getTime()))
    .flatMap(c => c.photos);
  return photos.slice(0, max);
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pnpm test -- --testPathPattern="photo-matcher" --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/journey/photo-matcher.ts __tests__/lib/journey/photo-matcher.test.ts
git commit -m "feat(journey): add photo matcher for check-in photo lookup"
```

---

## Task 4: Repository Extensions

**Files:**
- Modify: `src/lib/repositories/body-test.repository.ts`
- Modify: `src/lib/repositories/check-in.repository.ts`

- [ ] **Step 1: Add `findAllByMemberAscending` to body test repository**

In `src/lib/repositories/body-test.repository.ts`, add to the `IBodyTestRepository` interface (after `findLatestByMember`):

```typescript
  findAllByMemberAscending(memberId: string): Promise<IBodyTest[]>;
```

And add to `MongoBodyTestRepository` class (after the `findLatestByMember` method):

```typescript
  async findAllByMemberAscending(memberId: string): Promise<IBodyTest[]> {
    return BodyTestModel.find({ memberId: new mongoose.Types.ObjectId(memberId) }).sort({ date: 1 });
  }
```

- [ ] **Step 2: Add `findPhotosForMember` to check-in repository**

In `src/lib/repositories/check-in.repository.ts`, add to the `ICheckInRepository` interface (after `countSince`):

```typescript
  findPhotosForMember(memberId: string): Promise<{ submittedAt: Date; photos: string[] }[]>;
```

And add to `MongoCheckInRepository` class (after `countSince`):

```typescript
  async findPhotosForMember(memberId: string): Promise<{ submittedAt: Date; photos: string[] }[]> {
    return CheckInModel.find(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { submittedAt: 1, photos: 1, _id: 0 },
    ).sort({ submittedAt: 1 }).lean();
  }
```

- [ ] **Step 3: Run lint and existing tests to confirm nothing broke**

```bash
pnpm lint && pnpm test -- --testPathPattern="check-in|body-test" --no-coverage
```

Expected: no lint errors, all existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/repositories/body-test.repository.ts src/lib/repositories/check-in.repository.ts
git commit -m "feat(journey): add repository methods for journey data assembly"
```

---

## Task 5: Journey API Route

**Files:**
- Create: `src/app/api/members/[memberId]/journey/route.ts`
- Test: `__tests__/app/api/members/journey-route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/app/api/members/journey-route.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findAllByMemberAscending: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));

const mockCheckInRepo = { findPhotosForMember: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

type RouteContext = { params: Promise<{ memberId: string }> };

describe('GET /api/members/[memberId]/journey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'other', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when a trainer tries to access this member-only endpoint', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(403);
  });

  it('returns empty items and null summary when member has no body tests', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(0);
    expect(data.summary).toBeNull();
    expect(data.nextCursor).toBeNull();
  });

  it('returns items with summary when member has body tests', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([
      { _id: { toString: () => 'bt1' }, date: new Date('2024-01-01'), bodyFatPct: 24.0, weight: 76.0, leanMassKg: 57.6, fatMassKg: 18.4, targetBodyFatPct: null, targetWeight: null },
      { _id: { toString: () => 'bt2' }, date: new Date('2024-03-01'), bodyFatPct: 22.0, weight: 74.0, leanMassKg: 57.7, fatMassKg: 16.3, targetBodyFatPct: null, targetWeight: null },
    ]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.totalTests).toBe(2);
    expect(data.summary.firstBodyFatPct).toBe(24.0);
    expect(data.summary.latestBodyFatPct).toBe(22.0);
    expect(data.items).toHaveLength(2);
    // newest first
    expect(data.items[0].bodyTest.bodyFatPct).toBe(22.0);
    expect(data.items[0].bodyTest.testNumber).toBe(2);
    expect(data.items[1].bodyTest.testNumber).toBe(1);
  });

  it('first item is marked as milestone (time_milestone: first test)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([
      { _id: { toString: () => 'bt1' }, date: new Date('2024-01-01'), bodyFatPct: 24.0, weight: 76.0, leanMassKg: 57.6, fatMassKg: 18.4, targetBodyFatPct: null, targetWeight: null },
    ]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    const data = await res.json();
    expect(data.items[0].milestone).not.toBeNull();
    expect(data.items[0].milestone.emoji).toBe('🌟');
  });

  it('respects cursor pagination', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const tests = Array.from({ length: 15 }, (_, i) => ({
      _id: { toString: () => `bt${i}` },
      date: new Date(2024, 0, i + 1),
      bodyFatPct: 24.0 - i * 0.1,
      weight: 76.0 - i * 0.2,
      leanMassKg: 57.6 + i * 0.05,
      fatMassKg: 18.4 - i * 0.1,
      targetBodyFatPct: null,
      targetWeight: null,
    }));
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue(tests);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey?limit=10'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    const data = await res.json();
    expect(data.items).toHaveLength(10);
    expect(data.nextCursor).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (module not found)**

```bash
pnpm test -- --testPathPattern="journey-route" --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/members/[memberId]/journey/route'`

- [ ] **Step 3: Implement the API route**

```typescript
// src/app/api/members/[memberId]/journey/route.ts
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { evaluateMilestone, selectEmoji, buildMilestoneTitle } from '@/lib/journey/milestone-calculator';
import { findNearestPhoto, findPhotosNear } from '@/lib/journey/photo-matcher';
import type { JourneyResponse, JourneySummary, JourneyItem, MilestoneInfo } from '@/lib/types/journey';
import type { BodyTestSnapshot } from '@/lib/journey/milestone-calculator';
import type { CheckInPhotoEntry } from '@/lib/journey/photo-matcher';
import type { IBodyTest } from '@/lib/db/models/body-test.model';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });

  const { memberId } = await params;

  if (session.user.role !== 'member' || session.user.id !== memberId) {
    return new Response(null, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 50);

  await connectDB();

  const bodyTestRepo = new MongoBodyTestRepository();
  const checkInRepo = new MongoCheckInRepository();

  const [allTests, checkInData] = await Promise.all([
    bodyTestRepo.findAllByMemberAscending(memberId),
    checkInRepo.findPhotosForMember(memberId),
  ]);

  if (allTests.length === 0) {
    const response: JourneyResponse = { items: [], nextCursor: null, summary: null };
    return Response.json(response);
  }

  const first = allTests[0];
  const latest = allTests[allTests.length - 1];
  const summary: JourneySummary = {
    totalTests: allTests.length,
    firstTestDate: first.date.toISOString(),
    firstBodyFatPct: first.bodyFatPct,
    firstWeight: first.weight,
    firstLeanMassKg: first.leanMassKg,
    latestBodyFatPct: latest.bodyFatPct,
    latestWeight: latest.weight,
    latestLeanMassKg: latest.leanMassKg,
    leanMassDeltaKg: Math.round((latest.leanMassKg - first.leanMassKg) * 10) / 10,
  };

  const snapshots: BodyTestSnapshot[] = allTests.map((t: IBodyTest) => ({
    date: t.date,
    bodyFatPct: t.bodyFatPct,
    weight: t.weight,
    leanMassKg: t.leanMassKg,
    targetBodyFatPct: t.targetBodyFatPct,
    targetWeight: t.targetWeight,
  }));

  const photoEntries: CheckInPhotoEntry[] = checkInData.map(c => ({
    submittedAt: c.submittedAt,
    photos: c.photos,
  }));

  const checkInDates = photoEntries.map(c => c.submittedAt).sort((a, b) => a.getTime() - b.getTime());

  // Newest-first slice with cursor
  let descTests = [...allTests].reverse();
  if (cursor) {
    const cursorTime = new Date(cursor).getTime();
    descTests = descTests.filter(t => t.date.getTime() < cursorTime);
  }
  const pageSlice = descTests.slice(0, limit);
  const nextCursor = pageSlice.length === limit && descTests.length > limit
    ? pageSlice[pageSlice.length - 1].date.toISOString()
    : null;

  const items: JourneyItem[] = pageSlice.map((test: IBodyTest) => {
    const globalIndex = allTests.findIndex(t => t._id.toString() === test._id.toString());
    const triggers = evaluateMilestone(globalIndex, snapshots, checkInDates);
    const prev = globalIndex > 0 ? allTests[globalIndex - 1] : null;

    const milestone: MilestoneInfo | null = triggers.length > 0
      ? {
          emoji: selectEmoji(triggers),
          title: buildMilestoneTitle(triggers),
          tags: triggers.map(t => ({ label: t.label, color: t.color })),
          photos: findPhotosNear(test.date, photoEntries, 3),
        }
      : null;

    const item: JourneyItem = {
      bodyTest: {
        id: test._id.toString(),
        date: test.date.toISOString(),
        testNumber: globalIndex + 1,
        bodyFatPct: test.bodyFatPct,
        weight: test.weight,
        leanMassKg: test.leanMassKg,
        fatMassKg: test.fatMassKg,
        deltaBodyFatPct: prev ? Math.round((test.bodyFatPct - prev.bodyFatPct) * 10) / 10 : null,
        deltaWeight: prev ? Math.round((test.weight - prev.weight) * 10) / 10 : null,
      },
      checkInPhoto: findNearestPhoto(test.date, photoEntries),
      milestone,
    };
    return item;
  });

  const response: JourneyResponse = { items, nextCursor, summary };
  return Response.json(response);
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pnpm test -- --testPathPattern="journey-route" --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/journey/route.ts __tests__/app/api/members/journey-route.test.ts
git commit -m "feat(journey): add GET /api/members/[memberId]/journey endpoint"
```

---

## Task 6: Navigation Item

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 1: Add 旅程 to the HEALTH nav group**

In `src/components/shared/app-shell.tsx`, find the member HEALTH group (lines ~26-30) and add the Journey item:

```typescript
// BEFORE:
      group: 'HEALTH',
      items: [
        { href: '/member/nutrition', label: 'My Nutrition' },
        { href: '/member/body-tests', label: 'Body Tests' },
        { href: '/member/check-in', label: 'Check-In' },
      ],

// AFTER:
      group: 'HEALTH',
      items: [
        { href: '/member/nutrition', label: 'My Nutrition' },
        { href: '/member/body-tests', label: 'Body Tests' },
        { href: '/member/check-in', label: 'Check-In' },
        { href: '/member/journey', label: '旅程' },
      ],
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/app-shell.tsx
git commit -m "feat(journey): add 旅程 nav item for member role"
```

---

## Task 7: Journey Header Component

**Files:**
- Create: `src/app/(dashboard)/member/journey/_components/journey-header.tsx`

- [ ] **Step 1: Create the header component**

```tsx
// src/app/(dashboard)/member/journey/_components/journey-header.tsx
import type { JourneySummary } from '@/lib/types/journey';

interface Props {
  summary: JourneySummary;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

export default function JourneyHeader({ summary }: Props) {
  const hasComparison = summary.totalTests >= 2;
  const bfDelta = hasComparison
    ? Math.round((summary.latestBodyFatPct - summary.firstBodyFatPct) * 10) / 10
    : null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-4 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-foreground text-xl font-bold leading-tight">我的旅程</h1>
          <p className="text-foreground/65 text-xs mt-0.5">
            {summary.totalTests} 次体测 · 开始于 {formatDate(summary.firstTestDate)}
          </p>
        </div>
        {bfDelta !== null && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            bfDelta < 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {bfDelta < 0 ? '↓' : '↑'} {Math.abs(bfDelta)}% 体脂
          </span>
        )}
      </div>

      {hasComparison && (
        <div className="flex gap-0 border-t border-primary/15 pt-3">
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 mb-1">起点</p>
            <p className="text-foreground text-sm font-bold">{summary.firstBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstWeight} kg · {formatDate(summary.firstTestDate)}
            </p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 mb-1">现在</p>
            <p className="text-primary-light text-sm font-bold">{summary.latestBodyFatPct}%</p>
            <p className="text-foreground/65 text-[10px]">{summary.latestWeight} kg</p>
          </div>
          <div className="flex-1 border-l border-primary/15 pl-3 ml-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 mb-1">瘦体质量</p>
            <p className={`text-sm font-bold ${summary.leanMassDeltaKg >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
              {formatDelta(summary.leanMassDeltaKg)} kg
            </p>
            <p className="text-foreground/65 text-[10px]">
              {summary.firstLeanMassKg.toFixed(1)} → {summary.latestLeanMassKg.toFixed(1)} kg
            </p>
          </div>
        </div>
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

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/journey/_components/journey-header.tsx
git commit -m "feat(journey): add JourneyHeader component"
```

---

## Task 8: Timeline Node Component

**Files:**
- Create: `src/app/(dashboard)/member/journey/_components/timeline-node.tsx`

- [ ] **Step 1: Create the timeline node**

```tsx
// src/app/(dashboard)/member/journey/_components/timeline-node.tsx
import Image from 'next/image';
import type { JourneyItem } from '@/lib/types/journey';

interface Props {
  item: JourneyItem;
  isLast: boolean;
}

export default function TimelineNode({ item, isLast }: Props) {
  const { bodyTest } = item;

  const bfDelta = bodyTest.deltaBodyFatPct;
  const isImprovement = bfDelta !== null && bfDelta < 0;

  const date = new Date(bodyTest.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  return (
    <div className="flex items-stretch gap-3">
      {/* Track: dot + connecting line */}
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary/20 shrink-0 z-10" />
        {!isLast && <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />}
      </div>

      {/* Card body */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2.5 bg-card rounded-lg border border-foreground/[0.06] px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-foreground/35 text-[10px] mb-0.5">
              {date} · 第{bodyTest.testNumber}次
            </p>
            <p className="text-foreground/90 text-xs font-semibold">
              体脂 {bodyTest.bodyFatPct}% · {bodyTest.weight} kg
            </p>
            {bfDelta !== null && (
              <p className={`text-[10px] mt-0.5 ${isImprovement ? 'text-emerald-400' : 'text-foreground/40'}`}>
                {isImprovement ? '↓' : '↑'} {Math.abs(bfDelta).toFixed(1)}% · 瘦体质量 {bodyTest.leanMassKg.toFixed(1)} kg
              </p>
            )}
          </div>

          {/* Photo thumbnail */}
          <div className="w-9 h-9 rounded-md overflow-hidden shrink-0">
            {item.checkInPhoto ? (
              <Image
                src={item.checkInPhoto}
                alt="打卡照片"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-foreground/[0.04] flex items-center justify-center border border-dashed border-foreground/10">
                <span className="text-sm">📷</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/journey/_components/timeline-node.tsx
git commit -m "feat(journey): add TimelineNode component"
```

---

## Task 9: Milestone Card Component

**Files:**
- Create: `src/app/(dashboard)/member/journey/_components/milestone-card.tsx`

- [ ] **Step 1: Create the milestone card**

```tsx
// src/app/(dashboard)/member/journey/_components/milestone-card.tsx
import Image from 'next/image';
import type { JourneyItem, MilestoneTagColor } from '@/lib/types/journey';

interface Props {
  item: JourneyItem;
  isLast: boolean;
}

const TAG_CLASSES: Record<MilestoneTagColor, string> = {
  gold: 'bg-amber-500/10 text-amber-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  indigo: 'bg-primary/[0.18] text-primary-light',
};

export default function MilestoneCard({ item, isLast }: Props) {
  const { bodyTest, milestone } = item;
  if (!milestone) return null;

  const date = new Date(bodyTest.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  return (
    <div className="flex items-stretch gap-3">
      {/* Track: large glowing dot + line */}
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-4 w-3.5 h-3.5 rounded-full bg-primary border-2 border-primary/40 shrink-0 z-10 shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_0_12px_rgba(99,102,241,0.3)]" />
        {!isLast && <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />}
      </div>

      {/* Milestone card body */}
      <div className="flex-1 min-w-0 pb-2 -ml-1">
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/[0.13] to-primary/[0.04] p-3.5 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
          {/* Header row */}
          <div className="flex items-start gap-2 mb-2.5">
            <span className="text-base shrink-0">{milestone.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-primary-light/70 text-[10px] mb-0.5">
                {date} · 加入第{Math.floor((new Date(bodyTest.date).getTime() - 0) / 0)}个月
              </p>
              <p className="text-foreground text-sm font-bold leading-snug">{milestone.title}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {milestone.tags.map((tag, i) => (
              <span
                key={i}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TAG_CLASSES[tag.color]}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex mb-3">
            <div className="flex-1">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">体脂</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.bodyFatPct}%</p>
              {bodyTest.deltaBodyFatPct !== null && (
                <p className={`text-[10px] mt-0.5 ${bodyTest.deltaBodyFatPct < 0 ? 'text-emerald-400' : 'text-foreground/40'}`}>
                  {bodyTest.deltaBodyFatPct < 0 ? '' : '+'}{bodyTest.deltaBodyFatPct.toFixed(1)}% vs 上次
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">体重</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.weight} kg</p>
              {bodyTest.deltaWeight !== null && (
                <p className={`text-[10px] mt-0.5 ${bodyTest.deltaWeight < 0 ? 'text-emerald-400' : 'text-foreground/40'}`}>
                  {bodyTest.deltaWeight > 0 ? '+' : ''}{bodyTest.deltaWeight.toFixed(1)} kg
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">瘦体质量</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.leanMassKg.toFixed(1)} kg</p>
              <p className="text-primary-light/50 text-[10px] mt-0.5">历史最高</p>
            </div>
          </div>

          {/* Photos strip */}
          {milestone.photos.length > 0 && (
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 h-14 rounded-lg overflow-hidden">
                  {milestone.photos[i] ? (
                    <Image
                      src={milestone.photos[i]}
                      alt={`里程碑照片 ${i + 1}`}
                      width={100}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/[0.04] border border-dashed border-primary/20 flex items-center justify-center">
                      <span className="text-lg text-foreground/10">📷</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Fix the month-count calculation in milestone-card.tsx** — the placeholder `Math.floor(.../ 0)` needs replacing with actual logic. Edit the date line:

```tsx
// Replace this line:
              {date} · 加入第{Math.floor((new Date(bodyTest.date).getTime() - 0) / 0)}个月

// With this:
              {date}
```

(The month count is already encoded in the time_milestone tag label; no need to duplicate it.)

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/member/journey/_components/milestone-card.tsx
git commit -m "feat(journey): add MilestoneCard component"
```

---

## Task 10: Journey Client + Page

**Files:**
- Create: `src/app/(dashboard)/member/journey/_components/journey-client.tsx`
- Create: `src/app/(dashboard)/member/journey/page.tsx`

- [ ] **Step 1: Create the journey client component**

```tsx
// src/app/(dashboard)/member/journey/_components/journey-client.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JourneyItem, JourneyResponse, JourneySummary } from '@/lib/types/journey';
import JourneyHeader from './journey-header';
import TimelineNode from './timeline-node';
import MilestoneCard from './milestone-card';

interface Props {
  memberId: string;
}

export default function JourneyClient({ memberId }: Props) {
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Use refs so the IntersectionObserver closure always sees current values
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  nextCursorRef.current = nextCursor;
  isLoadingMoreRef.current = isLoadingMore;

  const fetchPage = useCallback(async (cursor?: string): Promise<JourneyResponse> => {
    const url = new URL(`/api/members/${memberId}/journey`, window.location.origin);
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString());
    return res.json() as Promise<JourneyResponse>;
  }, [memberId]);

  useEffect(() => {
    fetchPage().then(data => {
      setItems(data.items);
      setSummary(data.summary);
      setNextCursor(data.nextCursor);
      setIsLoading(false);
    });
  }, [fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursorRef.current && !isLoadingMoreRef.current) {
          setIsLoadingMore(true);
          fetchPage(nextCursorRef.current).then(data => {
            setItems(prev => [...prev, ...data.items]);
            setNextCursor(data.nextCursor);
            setIsLoadingMore(false);
          });
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-3.5 shrink-0">
              <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-foreground/10 animate-pulse" />
              <div className="flex-1 w-0.5 bg-foreground/[0.06] mt-1 min-h-10" />
            </div>
            <div className="flex-1 pb-2">
              <div className="h-12 rounded-lg bg-foreground/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <span className="text-4xl">🏋️</span>
        <p className="text-foreground font-semibold">还没有体测记录</p>
        <p className="text-foreground/65 text-sm">请联系你的教练安排第一次体测</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <JourneyHeader summary={summary} />

      <div className="flex flex-col">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 && !nextCursor;
          return item.milestone ? (
            <MilestoneCard key={item.bodyTest.id} item={item} isLast={isLast} />
          ) : (
            <TimelineNode key={item.bodyTest.id} item={item} isLast={isLast} />
          );
        })}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isLoadingMore && (
        <div className="flex justify-center gap-1 py-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {!nextCursor && !isLoading && items.length > 0 && (
        <p className="text-center text-foreground/35 text-xs py-4">· 已显示全部记录 ·</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

```tsx
// src/app/(dashboard)/member/journey/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import JourneyClient from './_components/journey-client';

export const metadata = { title: '我的旅程' };

export default async function JourneyPage() {
  const session = await auth();
  if (!session || session.user.role !== 'member') redirect('/login');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <JourneyClient memberId={session.user.id} />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and full test suite**

```bash
pnpm lint && pnpm test --no-coverage
```

Expected: no lint errors, all tests PASS.

- [ ] **Step 4: Start dev server and verify in browser**

```bash
pnpm dev
```

Open http://localhost:3000/member/journey. Verify:
- 「旅程」 appears in the member sidebar nav
- Header shows stats or empty state
- Timeline renders with correct node types
- Scroll to bottom triggers lazy loading
- Spine line is perfectly aligned with dots at all screen sizes

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/member/journey/
git commit -m "feat(journey): add Journey page with timeline and lazy loading"
```

---

## Task 11: Update INDEX.md

**Files:**
- Modify: `docs/INDEX.md`

- [ ] **Step 1: Add plan row to INDEX.md**

In `docs/INDEX.md`, add after the journey design row:

```markdown
| Journey Page (Plan) | [journey-page-plan.md](2026-05-17/plans/journey-page-plan.md) | In Progress |
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md docs/2026-05-17/plans/journey-page-plan.md
git commit -m "docs: add Journey page implementation plan"
```
