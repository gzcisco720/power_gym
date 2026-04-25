# E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Playwright, seed a dedicated test DB, and write full E2E coverage across Owner, Trainer, and Member roles.

**Architecture:** Global setup drops/re-seeds `power_gym_test`, logs in as each role and saves `storageState` cookies; individual spec files load those cookies so tests start pre-authenticated. A single worker prevents concurrent DB conflicts.

**Tech Stack:** Playwright (`@playwright/test`), Mongoose (direct DB seed), bcryptjs, dotenv, Next.js 16 App Router, Auth.js v5 JWT strategy.

---

## File Structure

### New files
```
playwright.config.ts
.env.e2e                          # gitignored
e2e/
  global-setup.ts
  global-teardown.ts
  seed.ts
  .auth/                          # gitignored
    .gitkeep
  auth.spec.ts
  member/
    plan.spec.ts
    pbs.spec.ts
    nutrition.spec.ts
    body-tests.spec.ts
  trainer/
    plans.spec.ts
    members.spec.ts
    nutrition.spec.ts
    body-tests.spec.ts
  owner/
    dashboard.spec.ts
    trainers.spec.ts
    members.spec.ts
    invites.spec.ts
src/app/(auth)/register/
  _components/
    register-form.tsx             # NEW — Client Component
  page.tsx                        # MODIFIED — remove inline form
src/app/(dashboard)/trainer/
  members/page.tsx                # NEW — trainer member list
  page.tsx                        # NEW — redirect to /members
src/app/(dashboard)/member/
  page.tsx                        # NEW — redirect to /plan
src/components/shared/
  logout-button.tsx               # NEW — Server Component with signOut
```

### Modified files
```
src/components/shared/app-shell.tsx          # add logoutSlot prop + trainer Members nav
src/app/(dashboard)/layout.tsx               # pass <LogoutButton /> as logoutSlot
src/lib/auth/middleware-helpers.ts           # role-specific default paths
package.json                                 # add test:e2e scripts
.gitignore                                   # add e2e/.auth/ and .env.e2e
```

---

## Task 1: Fix Register Form Bug

**Context:** The register page (`src/app/(auth)/register/page.tsx`) uses a native HTML `<form action="/api/auth/register" method="POST">` which sends `application/x-www-form-urlencoded`, but the API route does `await req.json()`. This causes a JSON parse error and makes registration completely non-functional. Fix: extract the form into a `'use client'` component that uses `fetch` with JSON.

**Files:**
- Create: `src/app/(auth)/register/_components/register-form.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Test: `__tests__/app/(auth)/register/register-form.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/(auth)/register/register-form.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '@/app/(auth)/register/_components/register-form';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

test('submits JSON to /api/auth/register and redirects to /login on success', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true }),
  });

  render(<RegisterForm isFirstUser={false} />);

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'TestPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@test.com', password: 'TestPass123!', token: undefined }),
    });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

test('displays error message on failure', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Email does not match invite' }),
  });

  render(<RegisterForm isFirstUser={false} />);

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'TestPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(screen.getByText('Email does not match invite')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="register-form" --no-coverage
```

Expected: FAIL — `RegisterForm` not found.

- [ ] **Step 3: Create RegisterForm client component**

Create `src/app/(auth)/register/_components/register-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  token?: string;
  inviteRole?: 'trainer' | 'member' | null;
  isFirstUser: boolean;
}

export function RegisterForm({ token, inviteRole, isFirstUser }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name') as string,
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        token,
      }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
      setSubmitting(false);
      return;
    }
    router.push('/login');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {inviteRole && (
        <p className="text-[13px] text-[#444]">
          You were invited as a{' '}
          <span className="font-medium capitalize">{inviteRole}</span>.
        </p>
      )}
      {isFirstUser && (
        <p className="text-[13px] text-[#444]">Setting up your gym as owner.</p>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Full Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50"
      >
        {submitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Update register page to use RegisterForm**

Replace `src/app/(auth)/register/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';
import { RegisterForm } from './_components/register-form';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let isFirstUser = false;
  let inviteRole: 'trainer' | 'member' | null = null;

  if (!token) {
    await connectDB();
    const { MongoUserRepository } = await import('@/lib/repositories/user.repository');
    const userRepo = new MongoUserRepository();
    const count = await userRepo.count();
    if (count > 0) redirect('/login?error=invite-required');
    isFirstUser = true;
  } else {
    await connectDB();
    const inviteRepo = new MongoInviteRepository();
    const invite = await inviteRepo.findByToken(token);
    const validation = validateInviteToken(invite);
    if (!validation.valid) redirect('/login?error=invalid-invite');
    inviteRole = validation.invite.role;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Create account</h1>
          <p className="mt-1 text-[13px] text-[#444]">Complete your registration to get started.</p>
        </div>
        <RegisterForm token={token} inviteRole={inviteRole} isFirstUser={isFirstUser} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="register-form" --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 6: Lint and commit**

```bash
pnpm lint --fix && pnpm test --no-coverage
git add src/app/\(auth\)/register/ __tests__/app/\(auth\)/register/
git commit -m "fix: convert register form to client component with JSON fetch"
```

---

## Task 2: Create Missing Prerequisites (Trainer Members Page + Redirects + Logout)

**Context:** Three missing pieces block E2E tests:
1. No `/dashboard/trainer/members` page (trainer member list) — the design doc expects it.
2. No `/dashboard/trainer/page.tsx` or `/dashboard/member/page.tsx` — visiting those URLs shows a 404.
3. No logout button — `auth.spec.ts` tests logout flow.
Also: add trainer "Members" nav item to the app shell, and update the middleware default redirect for trainer to `/dashboard/trainer/members`.

**Files:**
- Create: `src/app/(dashboard)/trainer/members/page.tsx`
- Create: `src/app/(dashboard)/trainer/page.tsx`
- Create: `src/app/(dashboard)/member/page.tsx`
- Create: `src/components/shared/logout-button.tsx`
- Modify: `src/components/shared/app-shell.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/lib/auth/middleware-helpers.ts`
- Test: `__tests__/app/(dashboard)/trainer/members/page.test.tsx`

- [ ] **Step 1: Write the failing test for trainer members page**

Create `__tests__/app/(dashboard)/trainer/members/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import TrainerMembersPage from '@/app/(dashboard)/trainer/members/page';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({
    findAllMembers: jest.fn().mockResolvedValue([
      {
        _id: { toString: () => 'mem1' },
        name: 'Alice Test',
        email: 'alice@test.com',
      },
    ]),
  })),
}));

import { auth } from '@/lib/auth/auth';

beforeEach(() => {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'trainer1', role: 'trainer' },
  });
});

test('renders member list with email and navigation links', async () => {
  const ui = await TrainerMembersPage();
  render(ui);

  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /plan/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="trainer/members/page" --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create trainer members page**

Create `src/app/(dashboard)/trainer/members/page.tsx`:

```tsx
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { Card } from '@/components/ui/card';
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
      <div className="px-8 py-7">
        {members.length === 0 ? (
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Card
                key={member._id.toString()}
                className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex items-center justify-between hover:border-[#2a2a2a] transition-colors"
              >
                <div>
                  <div className="text-[14px] font-semibold text-white">{member.name}</div>
                  <div className="text-[12px] text-[#555] mt-0.5">{member.email}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/dashboard/trainer/members/${member._id}/plan`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Plan →
                  </Link>
                  <Link
                    href={`/dashboard/trainer/members/${member._id}/body-tests`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Body Tests →
                  </Link>
                  <Link
                    href={`/dashboard/trainer/members/${member._id}/nutrition`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Nutrition →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create redirect pages**

Create `src/app/(dashboard)/trainer/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function TrainerRootPage() {
  redirect('/dashboard/trainer/members');
}
```

Create `src/app/(dashboard)/member/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function MemberRootPage() {
  redirect('/dashboard/member/plan');
}
```

- [ ] **Step 5: Create LogoutButton server component**

Create `src/components/shared/logout-button.tsx`:

```tsx
import { signOut } from '@/lib/auth/auth';

export function LogoutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button
        type="submit"
        className="text-[11px] text-[#333] hover:text-[#555] transition-colors w-full text-left"
      >
        Sign out
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Update app-shell to add logoutSlot + trainer Members nav**

In `src/components/shared/app-shell.tsx`, make two changes:

**Change 1** — add Members item to trainer nav:
```tsx
// OLD
trainer: [
  {
    group: 'TRAINING',
    items: [{ href: '/dashboard/trainer/plans', label: 'Plan Templates' }],
  },
  {
    group: 'HEALTH',
    items: [{ href: '/dashboard/trainer/nutrition', label: 'Nutrition Templates' }],
  },
],

// NEW
trainer: [
  {
    group: 'MEMBERS',
    items: [{ href: '/dashboard/trainer/members', label: 'Members' }],
  },
  {
    group: 'TRAINING',
    items: [{ href: '/dashboard/trainer/plans', label: 'Plan Templates' }],
  },
  {
    group: 'HEALTH',
    items: [{ href: '/dashboard/trainer/nutrition', label: 'Nutrition Templates' }],
  },
],
```

**Change 2** — add `logoutSlot` prop to `SidebarContent` and `AppShell`, and render it in the footer:

```tsx
// Add to SidebarContentProps
interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userInitials: string;
  logoutSlot?: React.ReactNode;  // ADD THIS
}

// In SidebarContent footer — add logoutSlot below user info
<div className="border-t border-[#161616] px-5 py-4">
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[11px] font-semibold text-[#666]">
      {userInitials}
    </div>
    <div className="flex-1">
      <div className="text-[12px] font-medium text-[#444]">{userName}</div>
      <div className="text-[10px] capitalize text-[#2a2a2a]">{role}</div>
    </div>
  </div>
  {logoutSlot && <div className="mt-3">{logoutSlot}</div>}  {/* ADD THIS */}
</div>

// AppShellProps — add logoutSlot
interface AppShellProps {
  role: UserRole;
  userName: string;
  logoutSlot?: React.ReactNode;  // ADD THIS
  children: React.ReactNode;
}

// AppShell component — pass logoutSlot to both SidebarContent usages
export function AppShell({ role, userName, logoutSlot, children }: AppShellProps) {
  // ...
  // Desktop sidebar:
  <SidebarContent role={role} userName={userName} userInitials={userInitials} logoutSlot={logoutSlot} />
  // Mobile Sheet:
  <SidebarContent role={role} userName={userName} userInitials={userInitials} logoutSlot={logoutSlot} />
```

- [ ] **Step 7: Update DashboardLayout to pass LogoutButton**

Modify `src/app/(dashboard)/layout.tsx`:

```tsx
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import { LogoutButton } from '@/components/shared/logout-button';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={session.user.name ?? 'User'}
      logoutSlot={<LogoutButton />}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
```

- [ ] **Step 8: Update middleware-helpers to use role-specific default paths**

Replace the body of `src/lib/auth/middleware-helpers.ts`:

```ts
import type { UserRole } from '@/types/auth';

const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  owner: ['/dashboard/owner', '/dashboard/trainer', '/dashboard/member'],
  trainer: ['/dashboard/trainer', '/dashboard/member'],
  member: ['/dashboard/member'],
};

const ROLE_DEFAULT_PATH: Record<UserRole, string> = {
  owner: '/dashboard/owner',
  trainer: '/dashboard/trainer/members',
  member: '/dashboard/member/plan',
};

export function getRedirectForRole(role: UserRole, path: string): string | null {
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  const isAllowed = allowed.some((prefix) => path.startsWith(prefix));
  if (isAllowed) return null;
  return ROLE_DEFAULT_PATH[role];
}
```

- [ ] **Step 9: Run tests to verify**

```bash
pnpm test -- --testPathPattern="trainer/members/page|middleware-helpers" --no-coverage
```

Expected: PASS.

- [ ] **Step 10: Lint and commit**

```bash
pnpm lint --fix && pnpm test --no-coverage
git add src/app/\(dashboard\)/trainer/members/page.tsx \
  src/app/\(dashboard\)/trainer/page.tsx \
  src/app/\(dashboard\)/member/page.tsx \
  src/components/shared/logout-button.tsx \
  src/components/shared/app-shell.tsx \
  src/app/\(dashboard\)/layout.tsx \
  src/lib/auth/middleware-helpers.ts \
  __tests__/app/\(dashboard\)/trainer/members/
git commit -m "feat: add trainer members page, redirect pages, logout button, and updated nav"
```

---

## Task 3: Install Playwright and Configure

**Context:** Playwright is not installed. We need `@playwright/test` and `dotenv` (for global-setup to read `.env.e2e`). We also need to update `.gitignore`, create `playwright.config.ts`, `.env.e2e`, and add `test:e2e` scripts to `package.json`.

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `.env.e2e`
- Create: `e2e/.auth/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add -D @playwright/test dotenv
pnpm exec playwright install chromium
```

Expected: Chromium browser downloaded to `~/.cache/ms-playwright/`.

- [ ] **Step 2: Create playwright.config.ts**

Create `playwright.config.ts` at the project root:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      MONGODB_URI:
        'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin',
    },
  },
});
```

- [ ] **Step 3: Add test:e2e scripts to package.json**

In `package.json`, add to `"scripts"`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Create .env.e2e**

Create `.env.e2e` at the project root:

```
MONGODB_URI=mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin
```

- [ ] **Step 5: Update .gitignore**

Add to `.gitignore`:

```
# E2E
.env.e2e
e2e/.auth/
playwright-report/
test-results/
```

- [ ] **Step 6: Create e2e/.auth/.gitkeep**

Create `e2e/.auth/.gitkeep` (empty file — ensures the directory is tracked without tracking auth JSON files):

```bash
mkdir -p e2e/.auth && touch e2e/.auth/.gitkeep
```

- [ ] **Step 7: Commit configuration**

```bash
git add playwright.config.ts package.json .gitignore e2e/
git commit -m "chore: install Playwright and configure E2E test infrastructure"
```

---

## Task 4: Create e2e/seed.ts

**Context:** Seeds all test data into `power_gym_test` before each full test run. Uses relative imports to avoid path alias resolution issues in the Playwright compilation context.

**Files:**
- Create: `e2e/seed.ts`

- [ ] **Step 1: Create e2e/seed.ts**

Create `e2e/seed.ts`:

```ts
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../src/lib/db/models/user.model';
import { ExerciseModel } from '../src/lib/db/models/exercise.model';
import { FoodModel } from '../src/lib/db/models/food.model';
import { PlanTemplateModel } from '../src/lib/db/models/plan-template.model';
import { MemberPlanModel } from '../src/lib/db/models/member-plan.model';
import { WorkoutSessionModel } from '../src/lib/db/models/workout-session.model';
import { PersonalBestModel } from '../src/lib/db/models/personal-best.model';
import { NutritionTemplateModel } from '../src/lib/db/models/nutrition-template.model';
import { MemberNutritionPlanModel } from '../src/lib/db/models/member-nutrition-plan.model';
import { BodyTestModel } from '../src/lib/db/models/body-test.model';
import { InviteTokenModel } from '../src/lib/db/models/invite-token.model';

export async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // ── Users ────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({
    name: 'Test Owner',
    email: 'owner@test.com',
    passwordHash,
    role: 'owner',
    trainerId: null,
  });

  const trainer = await UserModel.create({
    name: 'Test Trainer',
    email: 'trainer@test.com',
    passwordHash,
    role: 'trainer',
    trainerId: owner._id,
  });

  const member = await UserModel.create({
    name: 'Test Member',
    email: 'member@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // ── Exercise ─────────────────────────────────────────────────────────────
  const benchPress = await ExerciseModel.create({
    name: 'Bench Press',
    muscleGroup: 'chest',
    isGlobal: true,
    createdBy: null,
    imageUrl: null,
    isBodyweight: false,
  });

  // ── Foods ─────────────────────────────────────────────────────────────────
  const rice = await FoodModel.create({
    name: 'Rice',
    brand: null,
    source: 'manual',
    isGlobal: true,
    per100g: { kcal: 365, protein: 7.1, carbs: 79.0, fat: 0.7 },
  });

  const chickenBreast = await FoodModel.create({
    name: 'Chicken Breast',
    brand: null,
    source: 'manual',
    isGlobal: true,
    per100g: { kcal: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  });

  // ── Plan Template ─────────────────────────────────────────────────────────
  const groupId = new mongoose.Types.ObjectId().toString();
  const planTemplate = await PlanTemplateModel.create({
    name: 'E2E Test Plan',
    description: null,
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          {
            groupId,
            isSuperset: false,
            exerciseId: benchPress._id,
            exerciseName: 'Bench Press',
            imageUrl: null,
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          },
        ],
      },
    ],
  });

  // ── Member Plan (deep copy) ───────────────────────────────────────────────
  const memberPlan = await MemberPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: planTemplate._id,
    name: planTemplate.name,
    days: planTemplate.days,
    isActive: true,
    assignedAt: new Date(),
  });

  // ── Workout Session ───────────────────────────────────────────────────────
  const now = new Date();
  const session = await WorkoutSessionModel.create({
    memberId: member._id,
    memberPlanId: memberPlan._id,
    dayNumber: 1,
    dayName: 'Push',
    startedAt: now,
    completedAt: now,
    sets: [
      {
        exerciseId: benchPress._id,
        exerciseName: 'Bench Press',
        groupId,
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 8,
        prescribedRepsMax: 12,
        isExtraSet: false,
        actualWeight: 60,
        actualReps: 8,
        completedAt: now,
      },
    ],
  });

  // ── Personal Best (Brzycki formula: 60 / (1.0278 - 0.0278 × 8) ≈ 74.5) ──
  await PersonalBestModel.create({
    memberId: member._id,
    exerciseId: benchPress._id,
    exerciseName: 'Bench Press',
    bestWeight: 60,
    bestReps: 8,
    estimatedOneRM: 74.5,
    achievedAt: now,
    sessionId: session._id,
  });

  // ── Nutrition Template ────────────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'E2E Nutrition Template',
    description: null,
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        targetKcal: 2500,
        targetProtein: 180,
        targetCarbs: 280,
        targetFat: 70,
        meals: [
          {
            name: 'Lunch',
            order: 1,
            items: [
              {
                foodId: rice._id,
                foodName: 'Rice',
                quantityG: 100,
                kcal: 365,
                protein: 7.1,
                carbs: 79.0,
                fat: 0.7,
              },
              {
                foodId: chickenBreast._id,
                foodName: 'Chicken Breast',
                quantityG: 150,
                kcal: 247.5,
                protein: 46.5,
                carbs: 0.0,
                fat: 5.4,
              },
            ],
          },
        ],
      },
    ],
  });

  // ── Member Nutrition Plan (deep copy) ────────────────────────────────────
  await MemberNutritionPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: nutritionTemplate._id,
    name: nutritionTemplate.name,
    isActive: true,
    assignedAt: new Date(),
    dayTypes: nutritionTemplate.dayTypes,
  });

  // ── Body Test ─────────────────────────────────────────────────────────────
  // chest=20, abdominal=25, thigh=15, sum=60, age=30 → JP 3-site male ≈ 18.0% BF
  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: new Date(),
    age: 30,
    sex: 'male',
    weight: 75,
    protocol: '3site',
    chest: 20,
    abdominal: 25,
    thigh: 15,
    bodyFatPct: 18.0,
    leanMassKg: 61.5,
    fatMassKg: 13.5,
    targetWeight: null,
    targetBodyFatPct: null,
  });

  // ── Invite Token ──────────────────────────────────────────────────────────
  await InviteTokenModel.create({
    token: 'e2e-test-invite-token',
    role: 'trainer',
    invitedBy: owner._id,
    recipientEmail: 'newtrainer@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles (no ts errors)**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors from `e2e/seed.ts`.

- [ ] **Step 3: Commit**

```bash
git add e2e/seed.ts
git commit -m "feat: add E2E seed data"
```

---

## Task 5: Create global-setup.ts and global-teardown.ts

**Context:** `global-setup.ts` runs before all tests: loads `.env.e2e`, connects to `power_gym_test`, drops all collections, seeds, then logs in as each role and saves auth cookies to `e2e/.auth/`. `global-teardown.ts` drops the test database after all tests complete.

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`

- [ ] **Step 1: Create e2e/global-setup.ts**

Create `e2e/global-setup.ts`:

```ts
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { seed } from './seed';

dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });

const BASE_URL = 'http://localhost:3000';
const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth');

async function loginAs(email: string, password: string, outFile: string): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard\//);

  await context.storageState({ path: outFile });
  await browser.close();
}

export default async function globalSetup(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.e2e');

  // Ensure auth directory exists
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Reset and seed test database
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.map((col) => db.dropCollection(col.name)));
  await seed();
  await mongoose.disconnect();

  // Save auth state for each role
  await loginAs('owner@test.com', 'TestPass123!', path.join(AUTH_DIR, 'owner.json'));
  await loginAs('trainer@test.com', 'TestPass123!', path.join(AUTH_DIR, 'trainer.json'));
  await loginAs('member@test.com', 'TestPass123!', path.join(AUTH_DIR, 'member.json'));
}
```

- [ ] **Step 2: Create e2e/global-teardown.ts**

Create `e2e/global-teardown.ts`:

```ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });

export default async function globalTeardown(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;

  await mongoose.connect(uri);
  await mongoose.connection.db!.dropDatabase();
  await mongoose.disconnect();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add e2e/global-setup.ts e2e/global-teardown.ts
git commit -m "feat: add E2E global setup and teardown"
```

---

## Task 6: auth.spec.ts

**Context:** Tests the full login/logout/register flows without pre-authenticated storageState. After Task 2, trainer redirects to `/dashboard/trainer/members` and member redirects to `/dashboard/member/plan`. The register test uses the seeded `e2e-test-invite-token` to create a new trainer account.

**Files:**
- Create: `e2e/auth.spec.ts`

- [ ] **Step 1: Create e2e/auth.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('owner login redirects to /dashboard/owner', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\/owner/);
    await expect(page).toHaveURL(/\/dashboard\/owner/);
  });

  test('trainer login redirects to /dashboard/trainer/members', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'trainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\/trainer/);
    await expect(page).toHaveURL(/\/dashboard\/trainer\/members/);
  });

  test('member login redirects to /dashboard/member/plan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\/member/);
    await expect(page).toHaveURL(/\/dashboard\/member\/plan/);
  });

  test('logout redirects to /login', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\//);

    // Click sign out
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('register via invite token creates trainer account', async ({ page }) => {
    await page.goto('/register?token=e2e-test-invite-token');
    await expect(page.getByText(/invited as a/i)).toBeVisible();

    await page.fill('#name', 'New Trainer');
    await page.fill('#email', 'newtrainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/login');

    // Login with new credentials
    await page.fill('#email', 'newtrainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard\/trainer/);
    await expect(page).toHaveURL(/\/dashboard\/trainer\/members/);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test(e2e): add auth spec"
```

---

## Task 7: e2e/member/plan.spec.ts

**Files:**
- Create: `e2e/member/plan.spec.ts`

- [ ] **Step 1: Create e2e/member/plan.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Training Plan', () => {
  test('plan page shows plan name and exercise', async ({ page }) => {
    await page.goto('/dashboard/member/plan');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
    await expect(page.getByText('Bench Press')).toBeVisible();
  });

  test('start session navigates to session page', async ({ page }) => {
    await page.goto('/dashboard/member/plan');
    await page.getByRole('link', { name: /start session/i }).first().click();
    await page.waitForURL(/\/session\/new/);
    await expect(page).toHaveURL(/\/session\/new/);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/member/plan.spec.ts
git commit -m "test(e2e): add member plan spec"
```

---

## Task 8: e2e/member/pbs.spec.ts

**Files:**
- Create: `e2e/member/pbs.spec.ts`

- [ ] **Step 1: Create e2e/member/pbs.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Personal Bests', () => {
  test('PB board shows Bench Press with estimated 1RM', async ({ page }) => {
    await page.goto('/dashboard/member/pbs');
    await expect(page.getByText('Bench Press')).toBeVisible();
    await expect(page.getByText(/est\. 1RM/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/member/pbs.spec.ts
git commit -m "test(e2e): add member pbs spec"
```

---

## Task 9: e2e/member/nutrition.spec.ts

**Files:**
- Create: `e2e/member/nutrition.spec.ts`

- [ ] **Step 1: Create e2e/member/nutrition.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Nutrition Plan', () => {
  test('shows Training Day tab and macro targets', async ({ page }) => {
    await page.goto('/dashboard/member/nutrition');
    await expect(page.getByRole('tab', { name: 'Training Day' })).toBeVisible();
    // Macro targets from seed: 2500 kcal, 180g protein, 280g carbs, 70g fat
    await expect(page.getByText('2500')).toBeVisible();
    await expect(page.getByText('180')).toBeVisible();
    await expect(page.getByText('280')).toBeVisible();
    await expect(page.getByText('70')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/member/nutrition.spec.ts
git commit -m "test(e2e): add member nutrition spec"
```

---

## Task 10: e2e/member/body-tests.spec.ts

**Files:**
- Create: `e2e/member/body-tests.spec.ts`

- [ ] **Step 1: Create e2e/member/body-tests.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Body Tests', () => {
  test('latest test card shows weight and body fat', async ({ page }) => {
    await page.goto('/dashboard/member/body-tests');
    // Seed: weight=75, bodyFatPct=18.0
    await expect(page.getByText('75')).toBeVisible();
    await expect(page.getByText('18.0')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/member/body-tests.spec.ts
git commit -m "test(e2e): add member body-tests spec"
```

---

## Task 11: e2e/trainer/plans.spec.ts

**Files:**
- Create: `e2e/trainer/plans.spec.ts`

- [ ] **Step 1: Create e2e/trainer/plans.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Plan Templates', () => {
  test('template list shows E2E Test Plan', async ({ page }) => {
    await page.goto('/dashboard/trainer/plans');
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('create new template and verify it appears in list', async ({ page }) => {
    await page.goto('/dashboard/trainer/plans/new');

    await page.fill('#plan-name', 'Playwright New Plan');
    await page.getByRole('button', { name: '+ Add Day' }).click();
    // Day name input appears — fill it
    await page.locator('input[placeholder="Day 1"]').fill('Leg Day');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/dashboard/trainer/plans');

    await expect(page.getByText('Playwright New Plan')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/trainer/plans.spec.ts
git commit -m "test(e2e): add trainer plans spec"
```

---

## Task 12: e2e/trainer/members.spec.ts

**Files:**
- Create: `e2e/trainer/members.spec.ts`

- [ ] **Step 1: Create e2e/trainer/members.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Members', () => {
  test('member list shows member email', async ({ page }) => {
    await page.goto('/dashboard/trainer/members');
    await expect(page.getByText('member@test.com')).toBeVisible();
  });

  test('click Plan link navigates to plan assignment page', async ({ page }) => {
    await page.goto('/dashboard/trainer/members');
    await page.getByRole('link', { name: 'Plan →' }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    // Plan assignment section should be visible
    await expect(page.getByText('Assign Plan')).toBeVisible();
  });

  test('assign plan to member', async ({ page }) => {
    await page.goto('/dashboard/trainer/members');
    await page.getByRole('link', { name: 'Plan →' }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);

    // Select "E2E Test Plan" from dropdown and assign
    await page.selectOption('select', { label: 'E2E Test Plan' });
    await page.getByRole('button', { name: 'Assign' }).click();

    // After assignment, plan name should appear in "Current Plan" section
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/trainer/members.spec.ts
git commit -m "test(e2e): add trainer members spec"
```

---

## Task 13: e2e/trainer/nutrition.spec.ts

**Files:**
- Create: `e2e/trainer/nutrition.spec.ts`

- [ ] **Step 1: Create e2e/trainer/nutrition.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Nutrition Templates', () => {
  test('template list shows E2E Nutrition Template', async ({ page }) => {
    await page.goto('/dashboard/trainer/nutrition');
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });

  test('create new nutrition template and verify it appears', async ({ page }) => {
    await page.goto('/dashboard/trainer/nutrition/new');

    await page.fill('#plan-name', 'Playwright Nutrition Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();

    // Fill the day type name input
    await page.locator('input[placeholder="e.g. Training Day"]').fill('Rest Day');
    // Set calories target
    await page.locator('input[type="number"]').first().fill('2000');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('/dashboard/trainer/nutrition');

    await expect(page.getByText('Playwright Nutrition Plan')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/trainer/nutrition.spec.ts
git commit -m "test(e2e): add trainer nutrition spec"
```

---

## Task 14: e2e/trainer/body-tests.spec.ts

**Context:** Must navigate to the member's body test page. The test navigates to the trainer members list first, then follows the "Body Tests →" link to get the URL containing the member's ID.

**Files:**
- Create: `e2e/trainer/body-tests.spec.ts`

- [ ] **Step 1: Create e2e/trainer/body-tests.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Body Tests', () => {
  test('add new body test for member', async ({ page }) => {
    // Navigate to trainer members, find body-tests link
    await page.goto('/dashboard/trainer/members');
    const bodyTestsLink = page.getByRole('link', { name: 'Body Tests →' });
    const href = await bodyTestsLink.getAttribute('href');
    await page.goto(href!);

    // Select 3-site protocol
    await page.selectOption('#protocol', '3site');
    // Sex defaults to male — no change needed

    // Fill required fields
    await page.fill('#age', '30');
    await page.fill('#weight', '76');
    await page.fill('#chest', '21');
    await page.fill('#abdominal', '26');
    await page.fill('#thigh', '16');

    // Submit
    await page.getByRole('button', { name: 'Save' }).click();

    // New test record should appear in history
    await expect(page.getByText('Weight 76 kg · Body Fat')).toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/trainer/body-tests.spec.ts
git commit -m "test(e2e): add trainer body-tests spec"
```

---

## Task 15: e2e/owner/dashboard.spec.ts

**Files:**
- Create: `e2e/owner/dashboard.spec.ts`

- [ ] **Step 1: Create e2e/owner/dashboard.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Dashboard', () => {
  test('shows stat cards and trainer breakdown', async ({ page }) => {
    await page.goto('/dashboard/owner');

    // 4 stat cards
    await expect(page.getByText('Trainers')).toBeVisible();
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Sessions / mo')).toBeVisible();
    await expect(page.getByText('Pending Invites')).toBeVisible();

    // Trainer breakdown shows seeded trainer
    await expect(page.getByText('trainer@test.com')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/owner/dashboard.spec.ts
git commit -m "test(e2e): add owner dashboard spec"
```

---

## Task 16: e2e/owner/trainers.spec.ts

**Files:**
- Create: `e2e/owner/trainers.spec.ts`

- [ ] **Step 1: Create e2e/owner/trainers.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Trainers', () => {
  test('trainer list shows trainer email', async ({ page }) => {
    await page.goto('/dashboard/owner/trainers');
    await expect(page.getByText('trainer@test.com')).toBeVisible();
  });

  test('expand Members shows member@test.com', async ({ page }) => {
    await page.goto('/dashboard/owner/trainers');
    // Click the "Members" expand button for the first trainer row
    await page.getByRole('button', { name: /members/i }).first().click();
    await expect(page.getByText('member@test.com')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/owner/trainers.spec.ts
git commit -m "test(e2e): add owner trainers spec"
```

---

## Task 17: e2e/owner/members.spec.ts

**Files:**
- Create: `e2e/owner/members.spec.ts`

- [ ] **Step 1: Create e2e/owner/members.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Members', () => {
  test('member list shows member email and trainer name', async ({ page }) => {
    await page.goto('/dashboard/owner/members');
    await expect(page.getByText('member@test.com')).toBeVisible();
    // Trainer column shows trainer's name
    await expect(page.getByText('Test Trainer')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/owner/members.spec.ts
git commit -m "test(e2e): add owner members spec"
```

---

## Task 18: e2e/owner/invites.spec.ts

**Context:** Tests the full invite flow: create invite via API (as owner), then register in a fresh browser context. The `page.request` fixture uses the owner's auth cookies for the API call. Registration uses a fresh context to avoid the authenticated-page cookie conflict.

**Files:**
- Create: `e2e/owner/invites.spec.ts`

- [ ] **Step 1: Create e2e/owner/invites.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/dashboard/owner/invites');
    await expect(page.getByText('newtrainer@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register, login succeeds', async ({ page, browser }) => {
    // Create a fresh invite via API (authenticated as owner via page cookies)
    const response = await page.request.post('/api/owner/invites', {
      data: { recipientEmail: 'e2einvite@test.com', role: 'trainer' },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    // Use fresh context for registration (not authenticated)
    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#name', 'E2E Invite User');
    await freshPage.fill('#email', 'e2einvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/login');

    // Login with new credentials
    await freshPage.fill('#email', 'e2einvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: 'Sign in' }).click();
    await freshPage.waitForURL(/\/dashboard\/trainer/);
    await expect(freshPage).toHaveURL(/\/dashboard\/trainer\/members/);

    await freshCtx.close();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/owner/invites.spec.ts
git commit -m "test(e2e): add owner invites spec"
```

---

## Task 19: Run Full Suite and Verify

**Context:** Run the complete test suite against a live dev server with the test DB. The first run will start the dev server; subsequent runs reuse it.

**Prerequisites:**
- Local MongoDB running with `power_gym_user` credentials
- Dev server NOT already running (or running with the test DB `MONGODB_URI`)

- [ ] **Step 1: Ensure test DB user exists in local MongoDB**

```bash
# Only needed once — verify power_gym_user can connect to power_gym_test
mongosh "mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin" --eval "db.runCommand({ ping: 1 })"
```

Expected: `{ ok: 1 }`.

- [ ] **Step 2: Run E2E suite**

```bash
pnpm test:e2e
```

Expected: all tests pass (17 spec files, ~30 tests).

- [ ] **Step 3: If tests fail — debug with UI mode**

```bash
pnpm test:e2e:ui
```

UI mode lets you step through each test visually and see screenshots/traces.

- [ ] **Step 4: View HTML report**

```bash
pnpm exec playwright show-report
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "test(e2e): complete E2E test suite — all tests passing"
```

---

## Appendix: Common Troubleshooting

### "MONGODB_URI not set in .env.e2e"
Create `.env.e2e` at the project root with the correct connection string for your local MongoDB.

### "authjs.session-token cookie not set after login"
Verify the dev server is using the test DB (`power_gym_test`). Check if `reuseExistingServer: true` is picking up a server running with the production DB. Kill the existing server and let Playwright start a fresh one.

### Tests fail on `page.waitForURL(/\/dashboard\/trainer\/members/)` 
After Task 2 is implemented, trainer login should redirect to `/dashboard/trainer/members`. Verify `middleware-helpers.ts` has `ROLE_DEFAULT_PATH.trainer = '/dashboard/trainer/members'`.

### seed.ts import errors ("Cannot find module '../src/lib/db/models/...'")
The `e2e/seed.ts` uses relative imports. If TypeScript resolves them differently in the Playwright compilation context, add a `tsconfig.e2e.json` in the project root:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node"
  }
}
```
Then set `tsconfig: 'tsconfig.e2e.json'` in `playwright.config.ts` under `use`.

### Body test "Save" submits but no new record appears
The body test API at `/api/members/[id]/body-tests` must accept requests from the trainer's session. Check the API route's authorization logic — it should allow the member's trainer to POST.
