# Per-Trainer Hub Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the owner's per-trainer hub from 3 sparse tabs to a 5-tab high-density information centre with proper Indigo Premium styling, real member health data, session trend charts, and paginated plan listings.

**Architecture:** New repository methods provide the data layer; server components with Suspense fetch and render; a shared `HubPagination` client component drives URL-param-based pagination; two new page routes add Training Plans and Nutrition Plans tabs.

**Tech Stack:** Next.js App Router server components, Recharts (BarChart), shadcn Pagination (to be installed), Tailwind v4 CSS tokens, Framer Motion via `src/lib/animations/variants.ts`.

---

## File Map

### Modified
- `src/lib/repositories/workout-session.repository.ts` — add `countByMemberIdsByMonth`, `countActiveMembersSince`, `findRecentCompletedByMemberIds`
- `src/lib/repositories/personal-best.repository.ts` — add `findRecentByMemberIds`
- `src/lib/repositories/user.repository.ts` — add `findAllMembersPaginated`
- `src/lib/repositories/plan-template.repository.ts` — add `findByCreatorPaginated`
- `src/lib/repositories/nutrition-template.repository.ts` — add `findByCreatorPaginated`
- `src/components/shared/tab-nav.tsx` — replace hardcoded hex with tokens
- `src/components/shared/trainer-tab-nav.tsx` — add Training Plans + Nutrition Plans tabs
- `src/app/(dashboard)/owner/trainers/[id]/layout.tsx` — replace hardcoded hex with tokens
- `src/app/(dashboard)/owner/trainers/[id]/page.tsx` — add chart Suspense boundary
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx` — expand to 6 KPIs + chart
- `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx` — add pagination + restructure
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx` — add health display + status badges

### Created
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx`
- `src/components/shared/hub-pagination.tsx`

### Test files
- `__tests__/lib/repositories/workout-session-repo-trainer-hub.test.ts`
- `__tests__/lib/repositories/personal-best-repo-trainer-hub.test.ts`
- `__tests__/lib/repositories/user-repo-paginated.test.ts`
- `__tests__/lib/repositories/plan-template-repo-paginated.test.ts`
- `__tests__/lib/repositories/nutrition-template-repo-paginated.test.ts`
- `__tests__/components/shared/hub-pagination.test.tsx`

---

## Task 1: WorkoutSession repo — new trainer-hub methods

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Test: `__tests__/lib/repositories/workout-session-repo-trainer-hub.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/repositories/workout-session-repo-trainer-hub.test.ts
import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(WorkoutSessionModel);

describe('MongoWorkoutSessionRepository — trainer hub methods', () => {
  let repo: MongoWorkoutSessionRepository;
  beforeEach(() => { repo = new MongoWorkoutSessionRepository(); jest.clearAllMocks(); });

  describe('countByMemberIdsByMonth', () => {
    it('returns array of 6 month buckets with counts', async () => {
      mockModel.aggregate.mockResolvedValue([
        { _id: { year: 2026, month: 5 }, count: 34 },
      ] as never);
      const result = await repo.countByMemberIdsByMonth(['id1'], 6);
      expect(result).toHaveLength(6);
      expect(result[5].count).toBe(34); // current month is last
      expect(result[0].count).toBe(0);  // empty months fill with 0
    });

    it('returns empty counts when no sessions', async () => {
      mockModel.aggregate.mockResolvedValue([] as never);
      const result = await repo.countByMemberIdsByMonth(['id1'], 6);
      expect(result).toHaveLength(6);
      result.forEach(r => expect(r.count).toBe(0));
    });
  });

  describe('countActiveMembersSince', () => {
    it('returns count of distinct members with completed sessions', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      mockModel.distinct.mockResolvedValue([id1, id2] as never);
      const result = await repo.countActiveMembersSince(['id1', 'id2'], new Date());
      expect(result).toBe(2);
    });

    it('returns 0 when no active members', async () => {
      mockModel.distinct.mockResolvedValue([] as never);
      const result = await repo.countActiveMembersSince([], new Date());
      expect(result).toBe(0);
    });
  });

  describe('findRecentCompletedByMemberIds', () => {
    it('returns mapped objects with memberId, dayName, completedAt', async () => {
      const mid = new mongoose.Types.ObjectId();
      const date = new Date('2026-05-10');
      const chainMock = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ memberId: mid, dayName: 'Day 3', completedAt: date }]) };
      mockModel.find.mockReturnValue(chainMock as never);
      const result = await repo.findRecentCompletedByMemberIds(['id1'], 5);
      expect(result).toEqual([{ memberId: mid.toString(), dayName: 'Day 3', completedAt: date }]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern=workout-session-repo-trainer-hub -t "countByMemberIdsByMonth|countActiveMembersSince|findRecentCompletedByMemberIds"
```
Expected: FAIL — methods do not exist yet.

- [ ] **Step 3: Add the three methods to the interface and implementation**

In `src/lib/repositories/workout-session.repository.ts`, add to `IWorkoutSessionRepository` interface (after the existing `countCompletedByMemberSince` line):

```ts
countByMemberIdsByMonth(memberIds: string[], months: number): Promise<{ label: string; count: number }[]>;
countActiveMembersSince(memberIds: string[], since: Date): Promise<number>;
findRecentCompletedByMemberIds(memberIds: string[], limit: number): Promise<{ memberId: string; dayName: string; completedAt: Date }[]>;
```

Add implementations inside `MongoWorkoutSessionRepository` class, after the `countCompletedByMemberSince` method:

```ts
async countByMemberIdsByMonth(memberIds: string[], months: number): Promise<{ label: string; count: number }[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await WorkoutSessionModel.aggregate<{ _id: { year: number; month: number }; count: number }>([
    {
      $match: {
        memberId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
        completedAt: { $gte: since, $ne: null },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } },
        count: { $sum: 1 },
      },
    },
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: { label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = rows.find((r) => r._id.year === year && r._id.month === month);
    result.push({ label: MONTHS[month - 1], count: found?.count ?? 0 });
  }
  return result;
}

async countActiveMembersSince(memberIds: string[], since: Date): Promise<number> {
  const ids = await WorkoutSessionModel.distinct('memberId', {
    memberId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
    completedAt: { $gte: since, $ne: null },
  });
  return ids.length;
}

async findRecentCompletedByMemberIds(
  memberIds: string[],
  limit: number,
): Promise<{ memberId: string; dayName: string; completedAt: Date }[]> {
  const docs = await WorkoutSessionModel.find({
    memberId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
    completedAt: { $ne: null },
  })
    .select('memberId dayName completedAt')
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({
    memberId: d.memberId.toString(),
    dayName: d.dayName,
    completedAt: d.completedAt!,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=workout-session-repo-trainer-hub
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts __tests__/lib/repositories/workout-session-repo-trainer-hub.test.ts
git commit -m "feat(repo): add countByMemberIdsByMonth, countActiveMembersSince, findRecentCompletedByMemberIds to WorkoutSessionRepository"
```

---

## Task 2: PersonalBest repo — findRecentByMemberIds

**Files:**
- Modify: `src/lib/repositories/personal-best.repository.ts`
- Test: `__tests__/lib/repositories/personal-best-repo-trainer-hub.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/personal-best-repo-trainer-hub.test.ts
import mongoose from 'mongoose';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';

jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    updateOne: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PersonalBestModel);

describe('MongoPersonalBestRepository — findRecentByMemberIds', () => {
  let repo: MongoPersonalBestRepository;
  beforeEach(() => { repo = new MongoPersonalBestRepository(); jest.clearAllMocks(); });

  it('queries by memberIds, sorts by achievedAt desc, applies limit', async () => {
    const chainMock = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    mockModel.find.mockReturnValue(chainMock as never);
    const ids = [new mongoose.Types.ObjectId().toString()];
    await repo.findRecentByMemberIds(ids, 5);
    expect(mockModel.find).toHaveBeenCalledWith({
      memberId: { $in: expect.arrayContaining([expect.any(mongoose.Types.ObjectId)]) },
    });
    expect(chainMock.sort).toHaveBeenCalledWith({ achievedAt: -1 });
    expect(chainMock.limit).toHaveBeenCalledWith(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=personal-best-repo-trainer-hub
```
Expected: FAIL.

- [ ] **Step 3: Add method to interface and implementation**

In `src/lib/repositories/personal-best.repository.ts`, add to `IPersonalBestRepository`:

```ts
findRecentByMemberIds(memberIds: string[], limit: number): Promise<IPersonalBest[]>;
```

Add implementation inside `MongoPersonalBestRepository`, after `findByMemberIdsSince`:

```ts
async findRecentByMemberIds(memberIds: string[], limit: number): Promise<IPersonalBest[]> {
  return PersonalBestModel.find({
    memberId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .sort({ achievedAt: -1 })
    .limit(limit)
    .lean();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=personal-best-repo-trainer-hub
```
Expected: PASS — 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/personal-best.repository.ts __tests__/lib/repositories/personal-best-repo-trainer-hub.test.ts
git commit -m "feat(repo): add findRecentByMemberIds to PersonalBestRepository"
```

---

## Task 3: User, PlanTemplate, NutritionTemplate repos — paginated methods

**Files:**
- Modify: `src/lib/repositories/user.repository.ts`
- Modify: `src/lib/repositories/plan-template.repository.ts`
- Modify: `src/lib/repositories/nutrition-template.repository.ts`
- Test: `__tests__/lib/repositories/user-repo-paginated.test.ts`
- Test: `__tests__/lib/repositories/plan-template-repo-paginated.test.ts`
- Test: `__tests__/lib/repositories/nutrition-template-repo-paginated.test.ts`

- [ ] **Step 1: Write failing tests for all three**

```ts
// __tests__/lib/repositories/user-repo-paginated.test.ts
import mongoose from 'mongoose';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { UserModel } from '@/lib/db/models/user.model';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(UserModel);

describe('MongoUserRepository — findAllMembersPaginated', () => {
  let repo: MongoUserRepository;
  beforeEach(() => { repo = new MongoUserRepository(); jest.clearAllMocks(); });

  it('returns members and total for page 1', async () => {
    const chainMock = { skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ _id: 'm1' }]) };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(15 as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    const result = await repo.findAllMembersPaginated(trainerId, 1, 10);
    expect(chainMock.skip).toHaveBeenCalledWith(0);
    expect(chainMock.limit).toHaveBeenCalledWith(10);
    expect(result.total).toBe(15);
  });

  it('skips correct number of items for page 2', async () => {
    const chainMock = { skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(15 as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    await repo.findAllMembersPaginated(trainerId, 2, 10);
    expect(chainMock.skip).toHaveBeenCalledWith(10);
  });
});
```

```ts
// __tests__/lib/repositories/plan-template-repo-paginated.test.ts
import mongoose from 'mongoose';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

jest.mock('@/lib/db/models/plan-template.model', () => ({
  PlanTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PlanTemplateModel);

describe('MongoPlanTemplateRepository — findByCreatorPaginated', () => {
  let repo: MongoPlanTemplateRepository;
  beforeEach(() => { repo = new MongoPlanTemplateRepository(); jest.clearAllMocks(); });

  it('returns templates and total', async () => {
    const chainMock = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ name: 'PPL' }]) };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(5 as never);
    const id = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByCreatorPaginated(id, 1, 15);
    expect(result.total).toBe(5);
    expect(result.templates).toEqual([{ name: 'PPL' }]);
  });

  it('sorts by createdAt desc and skips for page 2', async () => {
    const chainMock = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(20 as never);
    const id = new mongoose.Types.ObjectId().toString();
    await repo.findByCreatorPaginated(id, 2, 15);
    expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chainMock.skip).toHaveBeenCalledWith(15);
  });
});
```

```ts
// __tests__/lib/repositories/nutrition-template-repo-paginated.test.ts
import mongoose from 'mongoose';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

jest.mock('@/lib/db/models/nutrition-template.model', () => ({
  NutritionTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionTemplateModel);

describe('MongoNutritionTemplateRepository — findByCreatorPaginated', () => {
  let repo: MongoNutritionTemplateRepository;
  beforeEach(() => { repo = new MongoNutritionTemplateRepository(); jest.clearAllMocks(); });

  it('returns templates and total', async () => {
    const chainMock = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ name: 'Lean Bulk' }]) };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(3 as never);
    const id = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByCreatorPaginated(id, 1, 15);
    expect(result.total).toBe(3);
  });
});
```

- [ ] **Step 2: Run all three to verify they fail**

```bash
pnpm test -- --testPathPattern="user-repo-paginated|plan-template-repo-paginated|nutrition-template-repo-paginated"
```
Expected: FAIL — methods do not exist.

- [ ] **Step 3: Add findAllMembersPaginated to UserRepository**

Add to `IUserRepository` interface in `src/lib/repositories/user.repository.ts`:
```ts
findAllMembersPaginated(trainerId: string, page: number, limit: number): Promise<{ members: IUser[]; total: number }>;
```

Add implementation inside `MongoUserRepository`, after `findAllMembers`:
```ts
async findAllMembersPaginated(trainerId: string, page: number, limit: number): Promise<{ members: IUser[]; total: number }> {
  const filter = { role: 'member' as const, trainerId: new mongoose.Types.ObjectId(trainerId) };
  const [members, total] = await Promise.all([
    UserModel.find(filter).skip((page - 1) * limit).limit(limit),
    UserModel.countDocuments(filter),
  ]);
  return { members, total };
}
```

- [ ] **Step 4: Add findByCreatorPaginated to PlanTemplateRepository**

Add to `IPlanTemplateRepository` interface in `src/lib/repositories/plan-template.repository.ts`:
```ts
findByCreatorPaginated(createdBy: string, page: number, limit: number): Promise<{ templates: IPlanTemplate[]; total: number }>;
```

Add implementation inside `MongoPlanTemplateRepository`, after `countByCreator`:
```ts
async findByCreatorPaginated(createdBy: string, page: number, limit: number): Promise<{ templates: IPlanTemplate[]; total: number }> {
  const filter = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  const [templates, total] = await Promise.all([
    PlanTemplateModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    PlanTemplateModel.countDocuments(filter),
  ]);
  return { templates, total };
}
```

- [ ] **Step 5: Add findByCreatorPaginated to NutritionTemplateRepository**

Add to `INutritionTemplateRepository` interface in `src/lib/repositories/nutrition-template.repository.ts`:
```ts
findByCreatorPaginated(createdBy: string, page: number, limit: number): Promise<{ templates: INutritionTemplate[]; total: number }>;
```

Add implementation inside `MongoNutritionTemplateRepository`, after `deleteById`:
```ts
async findByCreatorPaginated(createdBy: string, page: number, limit: number): Promise<{ templates: INutritionTemplate[]; total: number }> {
  const filter = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  const [templates, total] = await Promise.all([
    NutritionTemplateModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    NutritionTemplateModel.countDocuments(filter),
  ]);
  return { templates, total };
}
```

- [ ] **Step 6: Run all tests to verify they pass**

```bash
pnpm test -- --testPathPattern="user-repo-paginated|plan-template-repo-paginated|nutrition-template-repo-paginated"
```
Expected: PASS — 5 tests total.

- [ ] **Step 7: Commit**

```bash
git add \
  src/lib/repositories/user.repository.ts \
  src/lib/repositories/plan-template.repository.ts \
  src/lib/repositories/nutrition-template.repository.ts \
  __tests__/lib/repositories/user-repo-paginated.test.ts \
  __tests__/lib/repositories/plan-template-repo-paginated.test.ts \
  __tests__/lib/repositories/nutrition-template-repo-paginated.test.ts
git commit -m "feat(repo): add paginated query methods to User, PlanTemplate, NutritionTemplate repositories"
```

---

## Task 4: HubPagination shared component

**Files:**
- Create: `src/components/shared/hub-pagination.tsx`
- Test: `__tests__/components/shared/hub-pagination.test.tsx`

Install shadcn Pagination first (run this before writing tests):

- [ ] **Step 1: Install shadcn Pagination**

```bash
pnpm dlx shadcn@latest add pagination
```
Expected: creates `src/components/ui/pagination.tsx`.

- [ ] **Step 2: Write failing test**

```tsx
// __tests__/components/shared/hub-pagination.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HubPagination } from '@/components/shared/hub-pagination';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('HubPagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <HubPagination currentPage={1} totalPages={1} basePath="/owner/trainers/abc/members" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pagination when totalPages > 1', () => {
    render(
      <HubPagination currentPage={2} totalPages={4} basePath="/owner/trainers/abc/members" />
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders correct href for each page', () => {
    render(
      <HubPagination currentPage={1} totalPages={3} basePath="/owner/trainers/abc/members" />
    );
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href')).filter(Boolean);
    expect(hrefs).toContain('/owner/trainers/abc/members?page=1');
    expect(hrefs).toContain('/owner/trainers/abc/members?page=2');
    expect(hrefs).toContain('/owner/trainers/abc/members?page=3');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=hub-pagination
```
Expected: FAIL — module not found.

- [ ] **Step 4: Create HubPagination component**

```tsx
// src/components/shared/hub-pagination.tsx
'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface HubPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function HubPagination({ currentPage, totalPages, basePath }: HubPaginationProps) {
  if (totalPages <= 1) return null;

  const href = (page: number) => `${basePath}?page=${page}`;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <div className="mt-4 flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={currentPage > 1 ? href(currentPage - 1) : '#'}
              aria-disabled={currentPage <= 1}
              className={currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`e-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href={href(p)} isActive={p === currentPage}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href={currentPage < totalPages ? href(currentPage + 1) : '#'}
              aria-disabled={currentPage >= totalPages}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=hub-pagination
```
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/hub-pagination.tsx __tests__/components/shared/hub-pagination.test.tsx src/components/ui/pagination.tsx
git commit -m "feat(ui): add HubPagination shared component with shadcn Pagination"
```

---

## Task 5: TabNav + layout header visual upgrade

**Files:**
- Modify: `src/components/shared/tab-nav.tsx`
- Modify: `src/components/shared/trainer-tab-nav.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/layout.tsx`

No new tests (pure styling, covered by existing renders).

- [ ] **Step 1: Upgrade TabNav — replace hardcoded hex with tokens**

Replace the entire content of `src/components/shared/tab-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  segment: string;
}

interface TabNavProps {
  base: string;
  tabs: readonly Tab[];
}

export function TabNav({ base, tabs }: TabNavProps) {
  const pathname = usePathname();
  return (
    <div className="flex gap-0 border-b border-foreground/[.06] px-4 sm:px-8 overflow-x-auto">
      {tabs.map((tab) => {
        const href = `${base}${tab.segment}`;
        const isActive = tab.segment === '' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              'cursor-pointer whitespace-nowrap px-4 py-3 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-primary-light border-primary'
                : 'text-foreground/30 border-transparent hover:text-foreground/60',
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

- [ ] **Step 2: Upgrade TrainerTabNav — add two new tabs**

Replace the content of `src/components/shared/trainer-tab-nav.tsx`:

```tsx
import { TabNav } from './tab-nav';

const TABS = [
  { label: 'Overview',        segment: ''                 },
  { label: 'Members',         segment: '/members'         },
  { label: 'Calendar',        segment: '/calendar'        },
  { label: 'Training Plans',  segment: '/training-plans'  },
  { label: 'Nutrition Plans', segment: '/nutrition-plans' },
] as const;

export function TrainerTabNav({ trainerId }: { trainerId: string }) {
  return <TabNav base={`/owner/trainers/${trainerId}`} tabs={TABS} />;
}
```

- [ ] **Step 3: Upgrade layout.tsx header — replace hardcoded hex with tokens**

Replace the entire content of `src/app/(dashboard)/owner/trainers/[id]/layout.tsx`:

```tsx
import Link from 'next/link';
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
      <div className="sticky top-0 z-10 border-b border-foreground/[.06] bg-background">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_14px_rgba(99,102,241,0.35)] text-[13px] font-bold text-white">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-foreground leading-tight">{trainer.name}</div>
              <div className="text-[11px] text-foreground/35 mt-0.5">
                {trainer.email}
                <span className="mx-1.5 text-foreground/20">·</span>
                Joined {daysSinceJoined} days ago
              </div>
            </div>
          </div>
          <Link
            href="/owner/trainers"
            className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            ← All Trainers
          </Link>
        </div>
        <TrainerTabNav trainerId={trainerId} />
      </div>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Run full test suite and lint**

```bash
pnpm test && pnpm lint
```
Expected: all existing tests pass, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add \
  src/components/shared/tab-nav.tsx \
  src/components/shared/trainer-tab-nav.tsx \
  "src/app/(dashboard)/owner/trainers/[id]/layout.tsx"
git commit -m "feat(ui): upgrade TrainerHub header + TabNav to Indigo Premium tokens, add Training/Nutrition Plans tabs"
```

---

## Task 6: Overview tab — TrainerSessionsChartClient + expanded TrainerStatsSection

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/page.tsx`

- [ ] **Step 1: Create TrainerSessionsChartClient**

```tsx
// src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx
'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { label: string; count: number }[];
}

export function TrainerSessionsChartClient({ data }: Props) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-24 text-foreground/40 text-sm">
        No session data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart data={data} barSize={20}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#a5b4fc' }}
          formatter={(v) => [`${v} sessions`, '']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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

- [ ] **Step 2: Replace TrainerStatsSection with 6 KPIs + chart**

Replace the entire content of `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx`:

```tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { StatCard } from '@/components/shared/stat-card';
import { TrainerSessionsChartClient } from './trainer-sessions-chart-client';

export async function TrainerStatsSection({ trainerId }: { trainerId: string }) {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planTemplateRepo = new MongoPlanTemplateRepository();
  const pbRepo = new MongoPersonalBestRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [sessionsThisMonth, templateCount, activeThisMonth, newPRs, chartData, streaks] =
    await Promise.all([
      memberIds.length > 0
        ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
        : Promise.resolve(0),
      planTemplateRepo.countByCreator(trainerId),
      memberIds.length > 0
        ? sessionRepo.countActiveMembersSince(memberIds, startOfMonth)
        : Promise.resolve(0),
      memberIds.length > 0
        ? pbRepo.findByMemberIdsSince(memberIds, startOfMonth)
        : Promise.resolve([]),
      memberIds.length > 0
        ? sessionRepo.countByMemberIdsByMonth(memberIds, 6)
        : Promise.resolve([]),
      memberIds.length > 0
        ? Promise.all(memberIds.map((id) => sessionRepo.findConsecutiveStreakDays(id)))
        : Promise.resolve([]),
    ]);

  const avgStreak =
    streaks.length > 0
      ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Members" value={String(members.length)} accentColor="primary" />
        <StatCard label="Sessions / Mo" value={String(sessionsThisMonth)} />
        <StatCard label="Templates" value={String(templateCount)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Active / Mo"
          value={String(activeThisMonth)}
          delta={`of ${members.length} members`}
          accentColor="success"
        />
        <StatCard label="New PRs / Mo" value={String(newPRs.length)} />
        <StatCard label="Avg Streak" value={String(avgStreak)} unit="d" />
      </div>
      {chartData.length > 0 && (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
            Sessions — Last 6 Months
          </div>
          <TrainerSessionsChartClient data={chartData} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update Overview page.tsx Suspense fallback**

Replace the entire content of `src/app/(dashboard)/owner/trainers/[id]/page.tsx`:

```tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Suspense
        fallback={
          <div className="space-y-4">
            <StatCardsSkeleton count={6} className="grid-cols-3" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        }
      >
        <TrainerStatsSection trainerId={trainerId} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Run lint to catch any type errors**

```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add \
  "src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx" \
  "src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx" \
  "src/app/(dashboard)/owner/trainers/[id]/page.tsx"
git commit -m "feat(trainer-hub): expand Overview to 6 KPIs + sessions trend chart"
```

---

## Task 7: Members tab — top panels + health list

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx`
- Modify: `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx`

- [ ] **Step 1: Create TrainerHubMembersTopPanels server component**

```tsx
// src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';

interface Props { trainerId: string }

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD} days ago`;
}

export async function TrainerHubMembersTopPanels({ trainerId }: Props) {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const pbRepo = new MongoPersonalBestRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());
  const memberNameMap = Object.fromEntries(members.map((m) => [m._id.toString(), m.name]));

  if (memberIds.length === 0) return null;

  const [streaks, recentSessions, recentPRs] = await Promise.all([
    Promise.all(memberIds.map((id) => sessionRepo.findConsecutiveStreakDays(id))),
    sessionRepo.findRecentCompletedByMemberIds(memberIds, 5),
    pbRepo.findRecentByMemberIds(memberIds, 5),
  ]);

  const streakEntries = members
    .map((m, i) => ({ name: m.name, streak: streaks[i] }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);

  type ActivityItem = { text: string; time: Date };
  const activity: ActivityItem[] = [
    ...recentSessions.map((s) => ({
      text: `${memberNameMap[s.memberId] ?? 'Member'} completed ${s.dayName}`,
      time: s.completedAt,
    })),
    ...recentPRs.map((pb) => ({
      text: `${memberNameMap[pb.memberId.toString()] ?? 'Member'} hit new PR — ${pb.exerciseName}`,
      time: pb.achievedAt,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  const rankColors = ['text-amber-400 bg-amber-400/10', 'text-primary-light bg-primary/10', 'text-primary-light bg-primary/10'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      {/* Top Members */}
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Top Members
        </div>
        <div className="space-y-2">
          {streakEntries.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-foreground/25 w-4">{i + 1}</span>
              <span className="flex-1 text-sm text-foreground/70">{entry.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${rankColors[i]}`}>
                {entry.streak}d streak
              </span>
            </div>
          ))}
          {streakEntries.length === 0 && (
            <p className="text-xs text-foreground/30">No active streaks yet</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Recent Activity
        </div>
        <div className="space-y-2.5">
          {activity.map((item, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[11px] text-foreground/60 leading-snug">{item.text}</p>
                <p className="text-[10px] text-foreground/25 mt-0.5">{timeAgo(item.time)}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-xs text-foreground/30">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace TrainerHubMembersClient with health-aware version**

Replace the entire content of `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';

type MemberStatus = 'active' | 'needs-attn' | 'no-plan';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  streak: number;
  sessionsThisMonth: number;
  status: MemberStatus;
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

const statusConfig: Record<MemberStatus, { label: string; className: string }> = {
  active:     { label: 'Active',      className: 'bg-emerald-500/15 text-emerald-400' },
  'needs-attn': { label: 'Needs Attn', className: 'bg-amber-400/15 text-amber-400' },
  'no-plan':  { label: 'No Plan',     className: 'bg-destructive/15 text-destructive' },
};

export function TrainerHubMembersClient({ members, trainers, currentTrainerId }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
        <p className="text-sm text-foreground/40">No members assigned.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {members.map((member) => {
          const { label, className } = statusConfig[member.status];
          const initials = member.name.slice(0, 2).toUpperCase();
          return (
            <div
              key={member._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85">{member.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {member.streak}d streak · {member.sessionsThisMonth} sessions this month
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${className}`}>
                {label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/trainer/members/${member._id}`}
                  className="text-[11px] text-foreground/35 hover:text-foreground/70 transition-colors"
                >
                  View →
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReassigning(member)}
                  className="text-foreground/35 hover:text-foreground/70 hover:bg-white/[.06] text-xs h-7 px-2"
                >
                  Reassign
                </Button>
              </div>
            </div>
          );
        })}
      </div>

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

- [ ] **Step 3: Rewrite members/page.tsx with pagination + health data**

Replace the entire content of `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx`:

```tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { Skeleton } from '@/components/ui/skeleton';
import { HubPagination } from '@/components/shared/hub-pagination';
import { TrainerHubMembersTopPanels } from './_components/trainer-hub-members-top-panels';
import { TrainerHubMembersClient } from './_components/trainer-hub-members-client';

const PAGE_SIZE = 10;

export default async function TrainerHubMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planRepo = new MongoMemberPlanRepository();

  const [{ members, total }, allTrainers] = await Promise.all([
    userRepo.findAllMembersPaginated(trainerId, page, PAGE_SIZE),
    userRepo.findByRole('trainer'),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const memberHealthData = await Promise.all(
    members.map(async (m) => {
      const memberId = m._id.toString();
      const [streak, sessionsThisMonth, activePlan] = await Promise.all([
        sessionRepo.findConsecutiveStreakDays(memberId),
        sessionRepo.countCompletedByMemberSince(memberId, startOfMonth),
        planRepo.findActive(memberId),
      ]);
      const status = !activePlan ? 'no-plan' : streak > 0 ? 'active' : 'needs-attn';
      return {
        _id: memberId,
        name: m.name,
        email: m.email,
        trainerId: m.trainerId?.toString() ?? null,
        streak,
        sessionsThisMonth,
        status: status as 'active' | 'needs-attn' | 'no-plan',
      };
    }),
  );

  const trainerDtos = allTrainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = `/owner/trainers/${trainerId}/members`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      }>
        <TrainerHubMembersTopPanels trainerId={trainerId} />
      </Suspense>

      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        All Members ({total})
      </div>
      <TrainerHubMembersClient
        members={memberHealthData}
        trainers={trainerDtos}
        currentTrainerId={trainerId}
      />
      <HubPagination currentPage={page} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
```

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add \
  "src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx" \
  "src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx" \
  "src/app/(dashboard)/owner/trainers/[id]/members/page.tsx"
git commit -m "feat(trainer-hub): redesign Members tab with health board, top panels, activity feed, and pagination"
```

---

## Task 8: Training Plans tab

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { HubPagination } from '@/components/shared/hub-pagination';

const PAGE_SIZE = 15;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default async function TrainerHubTrainingPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const { templates, total } = await repo.findByCreatorPaginated(trainerId, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = `/owner/trainers/${trainerId}/training-plans`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        {total} Training Template{total !== 1 ? 's' : ''}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/40">This trainer hasn&apos;t created any training plans yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {templates.map((t) => (
            <Link
              key={t._id.toString()}
              href={`/owner/plans/${t._id.toString()}`}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-base">
                🏋️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{t.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {t.days.length} day{t.days.length !== 1 ? 's' : ''} · Created {formatDate(t.createdAt)}
                </div>
              </div>
              <span className="text-foreground/25 text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      <HubPagination currentPage={page} totalPages={totalPages} basePath={basePath} />
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
git add "src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx"
git commit -m "feat(trainer-hub): add Training Plans tab with paginated template list"
```

---

## Task 9: Nutrition Plans tab

**Files:**
- Create: `src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { HubPagination } from '@/components/shared/hub-pagination';

const PAGE_SIZE = 15;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default async function TrainerHubNutritionPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
  const { templates, total } = await repo.findByCreatorPaginated(trainerId, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = `/owner/trainers/${trainerId}/nutrition-plans`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        {total} Nutrition Template{total !== 1 ? 's' : ''}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/40">This trainer hasn&apos;t created any nutrition plans yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {templates.map((t) => (
            <Link
              key={t._id.toString()}
              href={`/owner/nutrition-templates/${t._id.toString()}/edit`}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-base">
                🥗
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{t.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {t.dayTypes.length} day type{t.dayTypes.length !== 1 ? 's' : ''} · Created {formatDate(t.createdAt)}
                </div>
              </div>
              <span className="text-foreground/25 text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      <HubPagination currentPage={page} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite and lint**

```bash
pnpm test && pnpm lint
```
Expected: all tests pass, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx"
git commit -m "feat(trainer-hub): add Nutrition Plans tab with paginated template list"
```

---

## Task 10: Final QA — build check + run all tests

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```
Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```
Expected: no warnings, no errors.

- [ ] **Step 3: Production build**

```bash
pnpm build
```
Expected: builds successfully with no type errors.

- [ ] **Step 4: Update docs INDEX.md**

The design doc `docs/2026-05-15/plans/per-trainer-hub-redesign.md` remains accurate — no changes needed.
Mark the plan complete by removing this plan file's INDEX row once all stages are done.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(trainer-hub): address build/lint issues from final QA"
```
