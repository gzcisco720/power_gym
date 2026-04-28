# Member Hub 页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 trainer 和 owner 构建 per-member hub 页面，包含 profile 头部、tab 导航（Overview / Plan / Body Tests / Nutrition / Progress）和 Overview 数据卡片。

**Architecture:** 新增 `trainer/members/[id]/layout.tsx` 作为共享层（权限校验 + profile 头部 + tab 导航），新增 `trainer/members/[id]/page.tsx` 作为 Overview tab，现有子页面保持不变。Owner 通过 `owner/members` 列表的 View → 链接复用 trainer 路由。

**Tech Stack:** Next.js 15 App Router（server components + client components）、TypeScript strict、MongoDB/Mongoose、Tailwind CSS、pnpm、Jest

---

## 文件结构

```
新增：
  src/app/(dashboard)/trainer/members/[id]/layout.tsx
  src/app/(dashboard)/trainer/members/[id]/page.tsx
  src/components/shared/member-tab-nav.tsx
  __tests__/app/trainer/member-hub-layout.test.ts
  __tests__/app/trainer/member-hub-page.test.ts
  __tests__/components/member-tab-nav.test.tsx

修改：
  src/lib/repositories/workout-session.repository.ts   ← 新增 findMemberStats()
  src/lib/repositories/body-test.repository.ts         ← 新增 findLatestByMember()
  src/app/(dashboard)/trainer/members/page.tsx         ← 卡片改为整体可点击
  src/app/(dashboard)/owner/members/_components/member-list-client.tsx  ← 新增 View → 链接
  __tests__/lib/repositories/workout-session.repository.test.ts         ← 新增测试
  __tests__/lib/repositories/body-test.repository.test.ts               ← 新增测试
```

---

## Task 1：`findMemberStats` — workout session repository

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Test: `__tests__/lib/repositories/workout-session.repository.test.ts`

- [ ] **Step 1: 写失败测试**

在 `__tests__/lib/repositories/workout-session.repository.test.ts` 末尾（在最后一个 `describe` 块内）新增：

```typescript
describe('findMemberStats', () => {
  it('returns completedCount and lastCompletedAt from aggregation', async () => {
    const aggMock = jest.fn().mockResolvedValue([
      { completedCount: 5, lastCompletedAt: new Date('2026-04-10') },
    ]);
    (WorkoutSessionModel as unknown as { aggregate: jest.Mock }).aggregate = aggMock;

    const result = await repo.findMemberStats('abc123');

    expect(result.completedCount).toBe(5);
    expect(result.lastCompletedAt).toEqual(new Date('2026-04-10'));
  });

  it('returns zero count and null date when no sessions', async () => {
    const aggMock = jest.fn().mockResolvedValue([]);
    (WorkoutSessionModel as unknown as { aggregate: jest.Mock }).aggregate = aggMock;

    const result = await repo.findMemberStats('abc123');

    expect(result.completedCount).toBe(0);
    expect(result.lastCompletedAt).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- --testPathPattern="workout-session.repository.test" --verbose
```

期望：FAIL，提示 `findMemberStats is not a function`

- [ ] **Step 3: 在 interface 和实现中新增方法**

在 `src/lib/repositories/workout-session.repository.ts` 的 `IWorkoutSessionRepository` interface 中添加：

```typescript
findMemberStats(memberId: string): Promise<{
  completedCount: number;
  lastCompletedAt: Date | null;
}>;
```

在 `MongoWorkoutSessionRepository` class 末尾添加实现：

```typescript
async findMemberStats(memberId: string): Promise<{
  completedCount: number;
  lastCompletedAt: Date | null;
}> {
  const results = await WorkoutSessionModel.aggregate<{
    completedCount: number;
    lastCompletedAt: Date | null;
  }>([
    {
      $match: {
        memberId: new mongoose.Types.ObjectId(memberId),
        completedAt: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        completedCount: { $sum: 1 },
        lastCompletedAt: { $max: '$completedAt' },
      },
    },
  ]);

  if (results.length === 0) {
    return { completedCount: 0, lastCompletedAt: null };
  }
  return {
    completedCount: results[0].completedCount,
    lastCompletedAt: results[0].lastCompletedAt,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- --testPathPattern="workout-session.repository.test" --verbose
```

期望：PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts \
        __tests__/lib/repositories/workout-session.repository.test.ts
git commit -m "feat: add findMemberStats to workout session repository"
```

---

## Task 2：`findLatestByMember` — body test repository

**Files:**
- Modify: `src/lib/repositories/body-test.repository.ts`
- Test: `__tests__/lib/repositories/body-test.repository.test.ts`

- [ ] **Step 1: 写失败测试**

打开 `__tests__/lib/repositories/body-test.repository.test.ts`，在文件末尾（现有 describe 块内）添加：

```typescript
describe('findLatestByMember', () => {
  it('returns the first result from findOne sorted by date desc', async () => {
    const mockTest = { _id: 'bt1', weight: 73, bodyFatPct: 18.2 };
    const limitMock = jest.fn().mockResolvedValue(mockTest);
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    mockModel.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    const result = await repo.findLatestByMember('mem1');

    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
    });
    expect(sortMock).toHaveBeenCalledWith({ date: -1 });
    expect(result).toEqual(mockTest);
  });

  it('returns null when no tests exist', async () => {
    const limitMock = jest.fn().mockResolvedValue(null);
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    mockModel.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    const result = await repo.findLatestByMember('mem1');

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- --testPathPattern="body-test.repository.test" --verbose
```

期望：FAIL，提示 `findLatestByMember is not a function`

- [ ] **Step 3: 在 interface 和实现中新增方法**

在 `src/lib/repositories/body-test.repository.ts` 的 `IBodyTestRepository` interface 中添加：

```typescript
findLatestByMember(memberId: string): Promise<IBodyTest | null>;
```

在 `MongoBodyTestRepository` class 末尾添加：

```typescript
async findLatestByMember(memberId: string): Promise<IBodyTest | null> {
  return BodyTestModel.findOne({
    memberId: new mongoose.Types.ObjectId(memberId),
  })
    .sort({ date: -1 })
    .limit(1);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- --testPathPattern="body-test.repository.test" --verbose
```

期望：PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/body-test.repository.ts \
        __tests__/lib/repositories/body-test.repository.test.ts
git commit -m "feat: add findLatestByMember to body test repository"
```

---

## Task 3：`MemberTabNav` client 组件

**Files:**
- Create: `src/components/shared/member-tab-nav.tsx`
- Test: `__tests__/components/member-tab-nav.test.tsx`

- [ ] **Step 1: 写失败测试**

新建文件 `__tests__/components/member-tab-nav.test.tsx`：

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from 'next/navigation';
import { MemberTabNav } from '@/components/shared/member-tab-nav';

const mockUsePathname = jest.mocked(usePathname);

describe('MemberTabNav', () => {
  const memberId = 'mem123';

  it('renders all 5 tabs', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}`);
    render(<MemberTabNav memberId={memberId} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Body Tests')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('highlights Overview tab when on hub root', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}`);
    render(<MemberTabNav memberId={memberId} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).toContain('text-white');
  });

  it('does not highlight Overview tab when on a sub-route', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}/plan`);
    render(<MemberTabNav memberId={memberId} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).not.toContain('text-white');
  });

  it('highlights Plan tab when on plan route', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}/plan`);
    render(<MemberTabNav memberId={memberId} />);

    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink?.className).toContain('text-white');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- --testPathPattern="member-tab-nav.test" --verbose
```

期望：FAIL，提示 `Cannot find module '@/components/shared/member-tab-nav'`

- [ ] **Step 3: 创建组件**

新建文件 `src/components/shared/member-tab-nav.tsx`：

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Progress', segment: '/progress' },
] as const;

interface MemberTabNavProps {
  memberId: string;
}

export function MemberTabNav({ memberId }: MemberTabNavProps) {
  const pathname = usePathname();
  const base = `/trainer/members/${memberId}`;

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

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- --testPathPattern="member-tab-nav.test" --verbose
```

期望：PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/member-tab-nav.tsx \
        __tests__/components/member-tab-nav.test.tsx
git commit -m "feat: add MemberTabNav client component"
```

---

## Task 4：`trainer/members/[id]/layout.tsx`

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/layout.tsx`
- Test: `__tests__/app/trainer/member-hub-layout.test.ts`

- [ ] **Step 1: 写失败测试**

新建文件 `__tests__/app/trainer/member-hub-layout.test.ts`：

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

// redirect() in Next.js throws at runtime — mirror that so code after redirect() stops
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from '@/lib/auth/auth';

const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('MemberHubLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/login',
    );
  });

  it('redirects trainer when member belongs to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      trainerId: { toString: () => 't2' },
    });
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/trainer/members',
    );
  });

  it('redirects when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { default: Layout } = await import(
      '@/app/(dashboard)/trainer/members/[id]/layout'
    );
    await expect(Layout({ children: null, ...makeParams('m1') })).rejects.toThrow(
      'REDIRECT:/trainer/members',
    );
  });

  it('renders for trainer when member belongs to them', async () => {
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

  it('renders for owner regardless of trainerId', async () => {
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
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- --testPathPattern="member-hub-layout.test" --verbose
```

期望：FAIL，提示 `Cannot find module '@/app/(dashboard)/trainer/members/[id]/layout'`

- [ ] **Step 3: 创建 layout**

新建文件 `src/app/(dashboard)/trainer/members/[id]/layout.tsx`：

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MemberTabNav } from '@/components/shared/member-tab-nav';
import type { UserRole } from '@/types/auth';

interface MemberHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
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

  const initials = member.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysSinceJoined = Math.floor(
    (Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div>
      {/* Profile header */}
      <div className="sticky top-0 z-10 border-b border-[#0f0f0f] bg-[#050505]">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[13px] font-semibold text-[#666]">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">{member.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5">
                {member.email}
                <span className="mx-1.5 text-[#333]">·</span>
                已加入 {daysSinceJoined} 天
              </div>
            </div>
          </div>
          {role === 'owner' && (
            <a
              href="/owner/members"
              className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
            >
              ← All Members
            </a>
          )}
        </div>
        <MemberTabNav memberId={memberId} />
      </div>

      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- --testPathPattern="member-hub-layout.test" --verbose
```

期望：PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/layout.tsx \
        __tests__/app/trainer/member-hub-layout.test.ts
git commit -m "feat: add MemberHubLayout with profile header and tab navigation"
```

---

## Task 5：Overview 页（`trainer/members/[id]/page.tsx`）

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/page.tsx`
- Test: `__tests__/app/trainer/member-hub-page.test.ts`

- [ ] **Step 1: 写失败测试**

新建文件 `__tests__/app/trainer/member-hub-page.test.ts`：

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findLatestByMember: jest.fn() };
const mockSessionRepo = { findMemberStats: jest.fn() };
const mockPlanRepo = { findActive: jest.fn() };

jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

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
  });

  it('renders without throwing when all data is null', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('fetches body test, stats and plan in parallel', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    await Page(makeParams('m1'));
    expect(mockBodyTestRepo.findLatestByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('passes body test data when available', async () => {
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({
      weight: 73,
      bodyFatPct: 18.2,
    });
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- --testPathPattern="member-hub-page.test" --verbose
```

期望：FAIL，提示 `Cannot find module '@/app/(dashboard)/trainer/members/[id]/page'`

- [ ] **Step 3: 创建 Overview 页**

新建文件 `src/app/(dashboard)/trainer/members/[id]/page.tsx`：

```typescript
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { StatCard } from '@/components/shared/stat-card';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

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
    <div className="px-4 sm:px-8 py-7">
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
        <StatCard
          label="累计训练"
          value={String(stats.completedCount)}
          unit="次"
        />
        <StatCard
          label="上次训练"
          value={lastTrainedLabel}
        />
        <StatCard
          label="当前计划"
          value={activePlan ? activePlan.name : '无计划'}
        />
      </div>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- --testPathPattern="member-hub-page.test" --verbose
```

期望：PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/page.tsx \
        __tests__/app/trainer/member-hub-page.test.ts
git commit -m "feat: add member hub Overview page with data cards"
```

---

## Task 6：更新成员列表入口

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/page.tsx`
- Modify: `src/app/(dashboard)/owner/members/_components/member-list-client.tsx`

> 此 task 为纯 UI 改动，无需新增 server/DB 逻辑，直接修改后运行全量测试即可。

- [ ] **Step 1: 更新 trainer 成员列表**

将 `src/app/(dashboard)/trainer/members/page.tsx` 的成员卡片从多个深链接改为整体可点击：

```typescript
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default async function TrainerMembersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
      />
      <div className="px-4 sm:px-8 py-7">
        {members.length === 0 ? (
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member._id.toString()}
                href={`/trainer/members/${member._id}`}
                className="block bg-[#0c0c0c] border border-[#141414] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors"
              >
                <div className="text-[14px] font-semibold text-white">{member.name}</div>
                <div className="text-[12px] text-[#888] mt-0.5">{member.email}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 owner 成员列表**

在 `src/app/(dashboard)/owner/members/_components/member-list-client.tsx` 中，给每行添加 `View →` 链接。

找到 `<div>` 按钮的那一列（当前只有 Reassign 按钮），将其改为同时包含 View 链接：

```typescript
// 在文件顶部 import 区域添加：
import Link from 'next/link';

// 将 Reassign 按钮所在的列（最后一个 <div>）替换为：
<div className="flex items-center gap-3">
  <Link
    href={`/trainer/members/${member._id}`}
    className="text-[11px] text-[#777] hover:text-[#aaa] transition-colors"
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
```

- [ ] **Step 3: 运行全量测试**

```bash
pnpm test
```

期望：全部 PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/trainer/members/page.tsx \
        src/app/(dashboard)/owner/members/_components/member-list-client.tsx
git commit -m "feat: update member lists to link to hub page"
```

---

## Task 7：更新 INDEX.md

- [ ] **Step 1: 更新文档**

在 `docs/INDEX.md` 中：
1. 将 Member Hub 设计文档的状态从 `Draft` 改为 `Approved`
2. 在 Implementation Plans 表格中新增一行：

```
| Member Hub 页面（Tab 导航） | [member-hub-implementation-plan.md](2026-04-28/plans/member-hub-implementation-plan.md) | Complete |
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark member hub design approved and add implementation plan to index"
```
