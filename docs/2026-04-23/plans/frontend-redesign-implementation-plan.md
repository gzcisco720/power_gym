# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native HTML elements with shadcn/ui components, apply the POWER GYM dark monochrome design system (Space Grotesk, layered blacks, white accent), add Framer Motion page transitions, and make the layout responsive with a collapsible sidebar.

**Architecture:** The dashboard shell is split into a server component (`layout.tsx`) that reads the Auth.js session and a client `AppShell` component that owns sidebar + mobile drawer state. All page content is wrapped in a `PageTransition` client component for enter animations. Shared components live in `src/components/shared/`.

**Tech Stack:** Next.js 16 App Router, shadcn/ui (base-nova style), Framer Motion, Space Grotesk (next/font/google), Tailwind CSS v4 (oklch), Lucide React icons.

---

## Task 1: Design System — CSS Variables + Font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace the `:root` and `.dark` blocks in `globals.css`**

The existing light-mode `:root` becomes our permanent dark palette. Keep the `@import` lines and `@theme inline` block untouched — only replace `:root` and `.dark`:

```css
/* src/app/globals.css — replace :root and .dark blocks only */

:root {
  --background: oklch(0.04 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.07 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0.05 0 0);
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(1 0 0);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.09 0 0);
  --secondary-foreground: oklch(0.38 0 0);
  --muted: oklch(0.09 0 0);
  --muted-foreground: oklch(0.38 0 0);
  --accent: oklch(0.09 0 0);
  --accent-foreground: oklch(0.58 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.09 0 0);
  --input: oklch(0.13 0 0);
  --ring: oklch(1 0 0);
  --radius: 0.75rem;
  --chart-1: oklch(1 0 0);
  --chart-2: oklch(0.58 0 0);
  --chart-3: oklch(0.38 0 0);
  --chart-4: oklch(0.21 0 0);
  --chart-5: oklch(0.09 0 0);
  --sidebar: oklch(0.05 0 0);
  --sidebar-foreground: oklch(1 0 0);
  --sidebar-primary: oklch(1 0 0);
  --sidebar-primary-foreground: oklch(0 0 0);
  --sidebar-accent: oklch(0.09 0 0);
  --sidebar-accent-foreground: oklch(0.58 0 0);
  --sidebar-border: oklch(0.10 0 0);
  --sidebar-ring: oklch(1 0 0);
}

.dark {
  --background: oklch(0.04 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.07 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0.05 0 0);
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(1 0 0);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.09 0 0);
  --secondary-foreground: oklch(0.38 0 0);
  --muted: oklch(0.09 0 0);
  --muted-foreground: oklch(0.38 0 0);
  --accent: oklch(0.09 0 0);
  --accent-foreground: oklch(0.58 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.09 0 0);
  --input: oklch(0.13 0 0);
  --ring: oklch(1 0 0);
  --chart-1: oklch(1 0 0);
  --chart-2: oklch(0.58 0 0);
  --chart-3: oklch(0.38 0 0);
  --chart-4: oklch(0.21 0 0);
  --chart-5: oklch(0.09 0 0);
  --sidebar: oklch(0.05 0 0);
  --sidebar-foreground: oklch(1 0 0);
  --sidebar-primary: oklch(1 0 0);
  --sidebar-primary-foreground: oklch(0 0 0);
  --sidebar-accent: oklch(0.09 0 0);
  --sidebar-accent-foreground: oklch(0.58 0 0);
  --sidebar-border: oklch(0.10 0 0);
  --sidebar-ring: oklch(1 0 0);
}
```

Also update `--font-sans` in the `@theme inline` block:
```css
@theme inline {
  --font-sans: var(--font-space-grotesk);   /* was --font-geist-sans */
  /* leave all other lines unchanged */
}
```

- [ ] **Step 2: Replace font in `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'POWER GYM',
  description: 'Professional gym management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build succeeds**

```bash
pnpm build
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: apply dark monochrome design system — Space Grotesk + oklch palette"
```

---

## Task 2: Install Missing Dependencies

**Files:** `package.json` (modified by package manager)

- [ ] **Step 1: Install Framer Motion**

```bash
pnpm add framer-motion
```

- [ ] **Step 2: Install shadcn components**

```bash
pnpm shadcn add card input select tabs badge separator sheet skeleton dialog sonner
```

Accept all prompts. This installs components into `src/components/ui/`.

- [ ] **Step 3: Verify installed files**

```bash
ls src/components/ui/
```

Expected output includes: `button.tsx card.tsx input.tsx select.tsx tabs.tsx badge.tsx separator.tsx sheet.tsx skeleton.tsx dialog.tsx sonner.tsx`

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ package.json pnpm-lock.yaml
git commit -m "feat: install shadcn components and framer-motion"
```

---

## Task 3: AppShell Component

**Files:**
- Create: `src/components/shared/app-shell.tsx`
- Create: `__tests__/components/shared/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/shared/app-shell.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from '@/components/shared/app-shell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/member/plan',
}));

describe('AppShell', () => {
  it('renders member navigation groups', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>page content</div>
      </AppShell>
    );
    expect(screen.getByText('My Plan')).toBeInTheDocument();
    expect(screen.getByText('Personal Bests')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Body Tests')).toBeInTheDocument();
    expect(screen.queryByText('Plan Templates')).not.toBeInTheDocument();
  });

  it('renders trainer navigation', () => {
    render(
      <AppShell role="trainer" userName="John Smith">
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByText('Plan Templates')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Templates')).toBeInTheDocument();
    expect(screen.queryByText('My Plan')).not.toBeInTheDocument();
  });

  it('renders user initials in avatar', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>content</div>
      </AppShell>
    );
    expect(screen.getAllByText('EG').length).toBeGreaterThan(0);
  });

  it('renders page children', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>my page content</div>
      </AppShell>
    );
    expect(screen.getByText('my page content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=app-shell
```

Expected: FAIL — `Cannot find module '@/components/shared/app-shell'`

- [ ] **Step 3: Create the AppShell component**

```tsx
// src/components/shared/app-shell.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

const NAV: Record<UserRole, { group: string; items: { href: string; label: string }[] }[]> = {
  member: [
    {
      group: 'TRAINING',
      items: [
        { href: '/dashboard/member/plan', label: 'My Plan' },
        { href: '/dashboard/member/pbs', label: 'Personal Bests' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/dashboard/member/nutrition', label: 'Nutrition' },
        { href: '/dashboard/member/body-tests', label: 'Body Tests' },
      ],
    },
  ],
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
  owner: [
    {
      group: 'TRAINING',
      items: [
        { href: '/dashboard/member/plan', label: 'My Plan' },
        { href: '/dashboard/member/pbs', label: 'Personal Bests' },
        { href: '/dashboard/trainer/plans', label: 'Plan Templates' },
      ],
    },
    {
      group: 'HEALTH',
      items: [
        { href: '/dashboard/member/nutrition', label: 'Nutrition' },
        { href: '/dashboard/member/body-tests', label: 'Body Tests' },
        { href: '/dashboard/trainer/nutrition', label: 'Nutrition Templates' },
      ],
    },
  ],
};

interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userInitials: string;
}

function SidebarContent({ role, userName, userInitials }: SidebarContentProps) {
  const pathname = usePathname();
  const groups = NAV[role] ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#161616] px-5 pb-6 pt-6">
        <div className="text-[11px] font-bold leading-tight tracking-[3px] text-white">
          POWER
          <br />
          GYM
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#333]">
          {role} portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {groups.map((group) => (
          <div key={group.group} className="mb-2">
            <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[2px] text-[#2a2a2a]">
              {group.group}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                  pathname.startsWith(item.href)
                    ? 'bg-white text-black'
                    : 'text-[#3a3a3a] hover:bg-[#141414] hover:text-[#888]'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#161616] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[11px] font-semibold text-[#666]">
            {userInitials}
          </div>
          <div>
            <div className="text-[12px] font-medium text-[#444]">{userName}</div>
            <div className="text-[10px] capitalize text-[#2a2a2a]">{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userInitials = userName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-[#030303]">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[#161616] bg-[#0a0a0a] lg:flex">
        <SidebarContent role={role} userName={userName} userInitials={userInitials} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[220px] border-r border-[#161616] bg-[#0a0a0a] p-0"
        >
          <SidebarContent role={role} userName={userName} userInitials={userInitials} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[#0f0f0f] px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[#444] hover:text-[#888] transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-bold tracking-[3px] text-white">POWER GYM</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#050505]">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=app-shell
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/app-shell.tsx __tests__/components/shared/app-shell.test.tsx
git commit -m "feat: add AppShell with role-based sidebar and mobile drawer"
```

---

## Task 4: Dashboard Layout + Page Transition

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/shared/page-transition.tsx`
- Create: `__tests__/components/shared/page-transition.test.tsx`

- [ ] **Step 1: Write the failing test for PageTransition**

```tsx
// __tests__/components/shared/page-transition.test.tsx
import { render, screen } from '@testing-library/react';
import { PageTransition } from '@/components/shared/page-transition';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/member/plan',
}));

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>test content</div>
      </PageTransition>
    );
    expect(screen.getByText('test content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=page-transition
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create PageTransition component**

```tsx
// src/components/shared/page-transition.tsx
'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduce ? 0.1 : 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Rewrite the dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={session.user.name ?? 'User'}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: all existing tests pass (layout has no unit test, but downstream tests must not break).

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/components/shared/page-transition.tsx __tests__/components/shared/page-transition.test.tsx
git commit -m "feat: wire AppShell + Framer Motion page transitions into dashboard layout"
```

---

## Task 5: Shared Components — StatCard, SectionHeader, EmptyState

**Files:**
- Create: `src/components/shared/stat-card.tsx`
- Create: `src/components/shared/section-header.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `__tests__/components/shared/shared-components.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/shared/shared-components.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/shared/stat-card';
import { SectionHeader } from '@/components/shared/section-header';
import { EmptyState } from '@/components/shared/empty-state';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="BODY WEIGHT" value="91.2" unit="kg" />);
    expect(screen.getByText('BODY WEIGHT')).toBeInTheDocument();
    expect(screen.getByText('91.2')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('renders delta when provided', () => {
    render(<StatCard label="SESSIONS" value="42" delta="12-day streak" />);
    expect(screen.getByText('12-day streak')).toBeInTheDocument();
  });

  it('renders without delta', () => {
    render(<StatCard label="SESSIONS" value="42" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Training Days" />);
    expect(screen.getByText('Training Days')).toBeInTheDocument();
  });

  it('renders action text when provided', () => {
    render(<SectionHeader title="Training Days" action="View all →" />);
    expect(screen.getByText('View all →')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders heading and description', () => {
    render(<EmptyState heading="No plan assigned" description="Your trainer hasn't assigned a plan yet." />);
    expect(screen.getByText('No plan assigned')).toBeInTheDocument();
    expect(screen.getByText("Your trainer hasn't assigned a plan yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=shared-components
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create StatCard**

```tsx
// src/components/shared/stat-card.tsx
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
}

export function StatCard({ label, value, unit, delta }: StatCardProps) {
  return (
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
      <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#2e2e2e] mb-2">
        {label}
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-1px] text-white">
        {value}
        {unit && (
          <span className="text-[11px] font-medium text-[#333] ml-1">{unit}</span>
        )}
      </div>
      {delta && (
        <div className="mt-1.5 text-[10px] text-[#333]">{delta}</div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Create SectionHeader**

```tsx
// src/components/shared/section-header.tsx
interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[13px] font-semibold text-white">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-[11px] text-[#2a2a2a] hover:text-[#555] transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create EmptyState**

```tsx
// src/components/shared/empty-state.tsx
interface EmptyStateProps {
  heading: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 text-[15px] font-semibold text-white">{heading}</div>
      <div className="mb-6 max-w-sm text-[13px] text-[#444]">{description}</div>
      {action}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=shared-components
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/stat-card.tsx src/components/shared/section-header.tsx src/components/shared/empty-state.tsx __tests__/components/shared/shared-components.test.tsx
git commit -m "feat: add StatCard, SectionHeader, EmptyState shared components"
```

---

## Task 6: Shared Components — ProgressBar, SetChip, PageHeader

**Files:**
- Create: `src/components/shared/progress-bar.tsx`
- Create: `src/components/shared/set-chip.tsx`
- Create: `src/components/shared/page-header.tsx`
- Modify: `__tests__/components/shared/shared-components.test.tsx`

- [ ] **Step 1: Add tests for new components**

Add to `__tests__/components/shared/shared-components.test.tsx`:

```tsx
import { ProgressBar } from '@/components/shared/progress-bar';
import { SetChip } from '@/components/shared/set-chip';
import { PageHeader } from '@/components/shared/page-header';

describe('ProgressBar', () => {
  it('renders with correct aria label', () => {
    render(<ProgressBar value={60} max={100} label="3 / 5 sets completed" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText('3 / 5 sets completed')).toBeInTheDocument();
  });
});

describe('SetChip', () => {
  it('renders set number when pending', () => {
    render(<SetChip setNumber={2} done={false} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders checkmark when done', () => {
    render(<SetChip setNumber={1} done={true} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="My Training Plan" subtitle="Push / Pull / Legs · Week 3" />);
    expect(screen.getByText('My Training Plan')).toBeInTheDocument();
    expect(screen.getByText('Push / Pull / Legs · Week 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
pnpm test -- --testPathPattern=shared-components
```

Expected: new tests FAIL (modules not found), old tests PASS.

- [ ] **Step 3: Create ProgressBar**

```tsx
// src/components/shared/progress-bar.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const shouldReduce = useReducedMotion();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label={label}
      className="h-[3px] w-full overflow-hidden rounded-full bg-[#141414]"
    >
      <motion.div
        className="h-full rounded-full bg-white"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: shouldReduce ? 0 : 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create SetChip**

```tsx
// src/components/shared/set-chip.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SetChipProps {
  setNumber: number;
  done: boolean;
  onClick?: () => void;
}

export function SetChip({ setNumber, done, onClick }: SetChipProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      animate={done && !shouldReduce ? { scale: [0.8, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[8px] font-bold transition-colors',
        done
          ? 'border-white bg-white text-black'
          : 'border-[#1e1e1e] bg-transparent text-[#2a2a2a] hover:border-[#333]'
      )}
      aria-label={done ? `Set ${setNumber} complete` : `Set ${setNumber}`}
    >
      {done ? '✓' : setNumber}
    </motion.button>
  );
}
```

- [ ] **Step 5: Create PageHeader**

```tsx
// src/components/shared/page-header.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0f0f0f] bg-[#050505] px-8 py-5">
      <div>
        <h1 className="text-[18px] font-bold tracking-[-0.3px] text-white">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-[#333]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify all pass**

```bash
pnpm test -- --testPathPattern=shared-components
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/progress-bar.tsx src/components/shared/set-chip.tsx src/components/shared/page-header.tsx __tests__/components/shared/shared-components.test.tsx
git commit -m "feat: add ProgressBar, SetChip, PageHeader shared components"
```

---

## Task 7: Auth Pages — Login + Register

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

No unit tests for server-action pages (behavior tested via E2E). Verify visually after `pnpm dev`.

- [ ] **Step 1: Rewrite Login page**

```tsx
// src/app/(auth)/login/page.tsx
import { signIn } from '@/lib/auth/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Sign in</h1>
          <p className="mt-1 text-[13px] text-[#444]">Enter your credentials to continue.</p>
        </div>

        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('credentials', {
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              redirectTo: '/dashboard',
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
            />
          </div>

          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Rewrite Register page**

First read the current register page — the server action and invite token logic must be preserved exactly:

```bash
cat src/app/(auth)/register/page.tsx
```

The file has a `'use server'` action inside the `<form action={...}>` prop that handles invite token validation and user creation. **Do not touch that action.** Only replace the JSX return structure. The rewritten file keeps all existing imports and the server action verbatim, and replaces only the `return (...)` block:

```tsx
// src/app/(auth)/register/page.tsx
// --- Keep all existing imports ---
// --- Keep existing server action function (defined inside component or above it) ---
// --- Only replace the return (...) block below ---
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// (All existing imports and server action remain above this return)
// Replace only the JSX:
return (
  <main className="flex min-h-screen items-center justify-center bg-[#030303]">
    <div className="w-full max-w-sm space-y-8">
      <div>
        <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Create account</h1>
        <p className="mt-1 text-[13px] text-[#444]">Complete your registration to get started.</p>
      </div>

      {/* form action stays exactly as it was in the original file */}
      <form action={registerAction} className="space-y-4">
        {/* hidden invite token input — keep exactly as-is from original */}

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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
          <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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
          <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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

        <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2">
          Create account
        </Button>
      </form>
    </div>
  </main>
);
```

> `registerAction` above is whatever name the original file gives to the server action — use the actual name from the file you read.

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/register/page.tsx
git commit -m "feat: redesign auth pages with dark monochrome theme"
```

---

## Task 8: Member — My Plan Page

**Files:**
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`
- Modify: `src/app/(dashboard)/member/plan/page.tsx`
- Modify: `__tests__/app/member/plan-overview.test.tsx` (update existing test)

- [ ] **Step 1: Read the existing component and test**

```bash
cat src/app/(dashboard)/member/plan/_components/plan-overview.tsx
cat __tests__/app/member/plan-overview.test.tsx
```

- [ ] **Step 2: Write updated test reflecting new design**

The test should check for the key UI elements — the plan name, day cards, and the start session button. Update `__tests__/app/member/plan-overview.test.tsx` to match the new component structure. Keep all behavioral assertions (plan name displayed, days listed, button present) — remove assertions that check for specific native HTML attributes that won't exist in the new design.

- [ ] **Step 3: Run test — confirm it fails if structure changed**

```bash
pnpm test -- --testPathPattern=plan-overview
```

- [ ] **Step 4: Rewrite plan-overview.tsx**

```tsx
// src/app/(dashboard)/member/plan/_components/plan-overview.tsx
'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/shared/section-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { cn } from '@/lib/utils';
import type { IMemberPlan } from '@/types/training';

interface PlanOverviewProps {
  plan: IMemberPlan | null;
}

export function PlanOverview({ plan }: PlanOverviewProps) {
  const shouldReduce = useReducedMotion();

  if (!plan) {
    return (
      <div className="px-8 py-28">
        <EmptyState
          heading="No plan assigned"
          description="Your trainer hasn't assigned a training plan yet. Check back soon."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Training Plan"
        subtitle={plan.name}
      />

      <div className="px-8 py-7 space-y-6">
        <div>
          <SectionHeader title="Training Days" />
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {plan.days.map((day, i) => (
              <motion.div
                key={day.dayNumber}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04, duration: 0.15 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-[10px] p-4 hover:border-[#2a2a2a] transition-colors">
                  <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#2a2a2a] mb-1">
                    DAY {String(day.dayNumber).padStart(2, '0')}
                  </div>
                  <div className="text-[13px] font-semibold text-white">{day.name}</div>
                  <div className="mt-1 text-[10px] text-[#2e2e2e]">
                    {day.exercises.length} exercises
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full bg-white text-black hover:bg-white/90 text-[11px] font-semibold"
                    asChild
                  >
                    <a href={`/dashboard/member/plan/session/new?day=${day.dayNumber}`}>
                      Start Session
                    </a>
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update page.tsx if needed**

```bash
cat src/app/(dashboard)/member/plan/page.tsx
```

The server component fetches data and passes it to `PlanOverview`. Keep data fetching unchanged — only update any inline JSX if present.

- [ ] **Step 6: Run tests**

```bash
pnpm test -- --testPathPattern=plan-overview
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/member/plan/_components/plan-overview.tsx src/app/(dashboard)/member/plan/page.tsx __tests__/app/member/plan-overview.test.tsx
git commit -m "feat: redesign member plan overview with shadcn cards and staggered animation"
```

---

## Task 9: Member — Session New + Session Logging Pages

**Files:**

- Modify: `src/app/(dashboard)/member/plan/session/new/page.tsx`
- Modify: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`
- Modify: `__tests__/app/member/session-logger.test.tsx`

### 9a — Session New (confirmation page)

- [ ] **Step 1: Read existing page**

```bash
cat src/app/(dashboard)/member/plan/session/new/page.tsx
```

- [ ] **Step 2: Rewrite confirmation UI**

The page reads `?day=N` from searchParams, fetches the day summary, and renders a confirmation card before the member starts the session. Keep the data fetching and form/redirect logic. Replace only the JSX:

```tsx
// Keep existing data fetch and redirect logic.
// Replace the return block:
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';

return (
  <div>
    <PageHeader title={`Start ${dayName}`} subtitle={`Day ${dayNumber} · ${exerciseCount} exercises`} />
    <div className="px-8 py-7">
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 max-w-md">
        <div className="text-[13px] font-semibold text-white mb-4">{planName}</div>
        <div className="space-y-2 mb-6">
          {exercises.map((ex) => (
            <div key={ex.exerciseId.toString()} className="flex items-center justify-between">
              <span className="text-[12px] text-[#666]">{ex.exerciseName}</span>
              <span className="text-[11px] text-[#333]">
                {ex.sets}×{ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}–${ex.repsMax}`}
              </span>
            </div>
          ))}
        </div>
        {/* keep existing form/POST action */}
        <form action={startSessionAction}>
          <input type="hidden" name="dayNumber" value={dayNumber} />
          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-semibold">
            Begin Session
          </Button>
        </form>
      </Card>
    </div>
  </div>
);
```

- [ ] **Step 3: Commit session/new**

```bash
git add src/app/(dashboard)/member/plan/session/new/page.tsx
git commit -m "feat: redesign session new confirmation page"
```

- [ ] **Step 1: Read existing component and test**

```bash
cat src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx
cat __tests__/app/member/session-logger.test.tsx
```

- [ ] **Step 2: Update the test to match new structure**

Keep all behavioral assertions:
- exercises are displayed
- set inputs appear when a set is tapped
- weight/reps can be entered
- completion state is reflected

Update element queries to use accessible roles/labels rather than native element selectors.

- [ ] **Step 3: Run test to confirm current state**

```bash
pnpm test -- --testPathPattern=session-logger
```

- [ ] **Step 4: Rewrite session-logger.tsx**

```tsx
// src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx
'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SetChip } from '@/components/shared/set-chip';
import { SectionHeader } from '@/components/shared/section-header';

// Keep all existing types and API call logic from the original file.
// Only replace the JSX return structure.

// Example structure — adapt to match existing props/state shape:
export function SessionLogger({ session: workoutSession }: { session: WorkoutSession }) {
  const shouldReduce = useReducedMotion();
  const completedSets = workoutSession.sets.filter((s) => s.completedAt !== null).length;
  const totalSets = workoutSession.sets.length;

  // Keep all existing state and handlers (activeSetIndex, handleLogSet, etc.)

  return (
    <div>
      <PageHeader
        title={workoutSession.dayName}
        subtitle={`${completedSets} / ${totalSets} sets completed`}
        actions={
          completedSets === totalSets ? (
            <Button
              onClick={handleComplete}
              className="bg-white text-black hover:bg-white/90 font-semibold"
            >
              Complete Session
            </Button>
          ) : null
        }
      />

      <div className="px-8 py-7 space-y-4">
        <ProgressBar
          value={completedSets}
          max={totalSets}
          label={`${completedSets} of ${totalSets} sets completed`}
        />

        {/* Group exercises by groupId */}
        <div className="space-y-3">
          {groupedExercises.map((group, gi) => (
            <motion.div
              key={group[0].groupId}
              initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduce ? 0 : gi * 0.04 }}
            >
              <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
                {group.map((exercise, ei) => (
                  <div
                    key={`${exercise.exerciseId}-${ei}`}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-[#0f0f0f] last:border-b-0"
                  >
                    <div className="text-[10px] font-semibold text-[#222] w-4 shrink-0">
                      {String(ei + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[#ccc]">
                        {exercise.exerciseName}
                      </div>
                      <div className="text-[10px] text-[#2e2e2e] mt-0.5">
                        {exercise.sets}×{exercise.repsMin === exercise.repsMax
                          ? exercise.repsMin
                          : `${exercise.repsMin}–${exercise.repsMax}`}
                        {exercise.restSeconds ? ` · ${exercise.restSeconds}s rest` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {setsForExercise(exercise.exerciseId).map((set, si) => (
                        <SetChip
                          key={si}
                          setNumber={si + 1}
                          done={set.completedAt !== null}
                          onClick={() => handleSetClick(set)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Inline set input — shown when a set is selected */}
        {activeSet && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
            <SectionHeader title={`Log Set — ${activeSet.exerciseName}`} />
            <div className="flex gap-3">
              {!activeSet.isBodyweight && (
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
                    Weight (kg)
                  </label>
                  <Input
                    type="number"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="bg-[#141414] border-[#1e1e1e] text-white focus-visible:ring-white"
                    aria-label="Weight in kg"
                  />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
                  Reps
                </label>
                <Input
                  type="number"
                  value={inputReps}
                  onChange={(e) => setInputReps(e.target.value)}
                  className="bg-[#141414] border-[#1e1e1e] text-white focus-visible:ring-white"
                  aria-label="Reps"
                />
              </div>
            </div>
            <Button
              onClick={handleLogSet}
              className="w-full bg-white text-black hover:bg-white/90 font-semibold"
            >
              Log Set
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
```

> **Note:** The key instruction is to keep all existing state variables, handlers, and data transformation logic. Only the JSX return structure changes. Do not alter `handleLogSet`, `handleComplete`, or any API call logic.

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx __tests__/app/member/session-logger.test.tsx
git commit -m "feat: redesign session logger with SetChip, ProgressBar, and inline log card"
```

---

## Task 10: Member — Personal Bests Page

**Files:**
- Modify: `src/app/(dashboard)/member/pbs/_components/pb-board.tsx`
- Modify: `__tests__/app/member/pb-board.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/member/pbs/_components/pb-board.tsx
cat __tests__/app/member/pb-board.test.tsx
```

- [ ] **Step 2: Update test — keep behavioral assertions, update element queries**

- [ ] **Step 3: Rewrite pb-board.tsx**

```tsx
// src/app/(dashboard)/member/pbs/_components/pb-board.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';
import type { IPersonalBest } from '@/types/training';

interface PbBoardProps {
  pbs: IPersonalBest[];
}

export function PbBoard({ pbs }: PbBoardProps) {
  const shouldReduce = useReducedMotion();

  if (pbs.length === 0) {
    return (
      <div>
        <PageHeader title="Personal Bests" />
        <div className="px-8 py-28">
          <EmptyState
            heading="No personal bests yet"
            description="Complete your first session to start tracking your records."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Personal Bests" subtitle={`${pbs.length} exercises tracked`} />

      <div className="px-8 py-7">
        <SectionHeader title="All Records" />
        <Card className="mt-3.5 bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {pbs.map((pb, i) => (
            <motion.div
              key={pb.exerciseId.toString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: shouldReduce ? 0 : i * 0.03 }}
              className="flex items-center justify-between px-5 py-3.5 border-b border-[#0f0f0f] last:border-b-0"
            >
              <div>
                <div className="text-[13px] font-medium text-[#ccc]">{pb.exerciseName}</div>
                <div className="text-[10px] text-[#2e2e2e] mt-0.5">
                  {pb.bestWeight ? `${pb.bestWeight} kg × ${pb.bestReps} reps` : `BW × ${pb.bestReps} reps`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-bold text-white">
                  {pb.estimatedOneRM.toFixed(1)}
                  <span className="text-[10px] font-medium text-[#333] ml-1">kg est. 1RM</span>
                </div>
              </div>
            </motion.div>
          ))}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=pb-board
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/pbs/_components/pb-board.tsx __tests__/app/member/pb-board.test.tsx
git commit -m "feat: redesign personal bests board"
```

---

## Task 11: Member — Nutrition Page

**Files:**
- Modify: `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`
- Modify: `__tests__/app/member/nutrition-plan-viewer.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx
cat __tests__/app/member/nutrition-plan-viewer.test.tsx
```

- [ ] **Step 2: Rewrite the viewer using Tabs for day types**

```tsx
// src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';
import type { IMemberNutritionPlan, IDayType } from '@/types/nutrition';

interface NutritionPlanViewerProps {
  plan: IMemberNutritionPlan | null;
}

export function NutritionPlanViewer({ plan }: NutritionPlanViewerProps) {
  if (!plan) {
    return (
      <div>
        <PageHeader title="Nutrition" />
        <div className="px-8 py-28">
          <EmptyState
            heading="No nutrition plan assigned"
            description="Your trainer hasn't assigned a nutrition plan yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nutrition" subtitle={plan.name} />

      <div className="px-8 py-7">
        <Tabs defaultValue={plan.dayTypes[0]?.name ?? ''}>
          <TabsList className="bg-transparent border-b border-[#141414] rounded-none w-full justify-start gap-0 h-auto p-0 mb-6">
            {plan.dayTypes.map((dayType: IDayType) => (
              <TabsTrigger
                key={dayType.name}
                value={dayType.name}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent text-[#333] data-[state=active]:text-white text-[13px] font-medium px-4 pb-3"
              >
                {dayType.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {plan.dayTypes.map((dayType: IDayType) => (
            <TabsContent key={dayType.name} value={dayType.name} className="space-y-6">
              {/* Macro targets */}
              <div>
                <SectionHeader title="Daily Targets" />
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <StatCard label="CALORIES" value={String(dayType.targetKcal)} unit="kcal" />
                  <StatCard label="PROTEIN" value={String(dayType.targetProteinG)} unit="g" />
                  <StatCard label="CARBS" value={String(dayType.targetCarbsG)} unit="g" />
                  <StatCard label="FAT" value={String(dayType.targetFatG)} unit="g" />
                </div>
              </div>

              {/* Meals */}
              <div>
                <SectionHeader title="Meals" />
                <div className="mt-3.5 space-y-3">
                  {dayType.meals.map((meal) => (
                    <Card key={meal.name} className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-[#141414]">
                        <div className="text-[13px] font-semibold text-white">{meal.name}</div>
                        <div className="text-[10px] text-[#2e2e2e] mt-0.5">
                          {meal.items.reduce((sum, item) => sum + item.kcal, 0)} kcal
                        </div>
                      </div>
                      {meal.items.map((item) => (
                        <div key={item.foodName} className="flex items-center justify-between px-5 py-3 border-b border-[#0f0f0f] last:border-b-0">
                          <div>
                            <div className="text-[12px] text-[#999]">{item.foodName}</div>
                            <div className="text-[10px] text-[#2a2a2a]">{item.amountG}g</div>
                          </div>
                          <div className="text-right text-[11px] text-[#444]">
                            P {item.proteinG}g · C {item.carbsG}g · F {item.fatG}g
                          </div>
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update test to match new structure, run all tests**

```bash
pnpm test -- --testPathPattern=nutrition-plan-viewer
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx __tests__/app/member/nutrition-plan-viewer.test.tsx
git commit -m "feat: redesign nutrition viewer with Tabs day-type switcher"
```

---

## Task 12: Member — Body Tests Page

**Files:**
- Modify: `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx`
- Modify: `__tests__/app/member/body-test-viewer.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx
cat __tests__/app/member/body-test-viewer.test.tsx
```

- [ ] **Step 2: Rewrite body-test-viewer.tsx**

```tsx
// src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { IBodyTest } from '@/types/body-test';

interface BodyTestViewerProps {
  tests: IBodyTest[];
}

export function BodyTestViewer({ tests }: BodyTestViewerProps) {
  const shouldReduce = useReducedMotion();
  const latest = tests[0];

  if (tests.length === 0) {
    return (
      <div>
        <PageHeader title="Body Composition" />
        <div className="px-8 py-28">
          <EmptyState
            heading="No body tests recorded"
            description="Your trainer will record your first body composition test."
          />
        </div>
      </div>
    );
  }

  const chartData = [...tests].reverse().map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: t.weight,
    bf: Number(t.bodyFatPct.toFixed(1)),
  }));

  return (
    <div>
      <PageHeader title="Body Composition" subtitle={`${tests.length} tests recorded`} />

      <div className="px-8 py-7 space-y-6">
        {/* Latest stats */}
        {latest && (
          <div>
            <SectionHeader title="Latest Results" />
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatCard label="BODY WEIGHT" value={String(latest.weight)} unit="kg" delta={latest.targetWeight ? `Goal: ${latest.targetWeight} kg` : undefined} />
              <StatCard label="BODY FAT" value={latest.bodyFatPct.toFixed(1)} unit="%" delta={latest.targetBodyFatPct ? `Goal: ${latest.targetBodyFatPct}%` : undefined} />
              <StatCard label="LEAN MASS" value={latest.leanMassKg.toFixed(1)} unit="kg" />
              <StatCard label="FAT MASS" value={latest.fatMassKg.toFixed(1)} unit="kg" />
            </div>
          </div>
        )}

        {/* History chart */}
        {tests.length > 1 && (
          <div>
            <SectionHeader title="History" />
            <Card className="mt-3.5 bg-[#0c0c0c] border-[#141414] rounded-xl p-5">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: '#2e2e2e', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="weight" orientation="left" tick={{ fill: '#2e2e2e', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="bf" orientation="right" tick={{ fill: '#2e2e2e', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, color: '#fff', fontSize: 11 }}
                  />
                  <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={1.5} dot={false} name="Weight (kg)" />
                  <Line yAxisId="bf" type="monotone" dataKey="bf" stroke="#555" strokeWidth={1.5} dot={false} name="Body Fat %" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* History cards */}
        <div>
          <SectionHeader title="All Tests" />
          <div className="mt-3.5 space-y-2.5">
            {tests.map((test, i) => (
              <motion.div
                key={test._id.toString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.03 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a]">
                      {new Date(test.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-[#333]">{test.protocol}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div>
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#2a2a2a]">Weight</div>
                      <div className="text-[14px] font-bold text-white">{test.weight}<span className="text-[9px] text-[#333] ml-0.5">kg</span></div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#2a2a2a]">Body Fat</div>
                      <div className="text-[14px] font-bold text-white">{test.bodyFatPct.toFixed(1)}<span className="text-[9px] text-[#333] ml-0.5">%</span></div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#2a2a2a]">Lean</div>
                      <div className="text-[14px] font-bold text-white">{test.leanMassKg.toFixed(1)}<span className="text-[9px] text-[#333] ml-0.5">kg</span></div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#2a2a2a]">Fat</div>
                      <div className="text-[14px] font-bold text-white">{test.fatMassKg.toFixed(1)}<span className="text-[9px] text-[#333] ml-0.5">kg</span></div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update test and run**

```bash
pnpm test -- --testPathPattern=body-test-viewer
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx __tests__/app/member/body-test-viewer.test.tsx
git commit -m "feat: redesign body test viewer with history chart and stat cards"
```

---

## Task 13: Trainer — Plan Templates List

**Files:**
- Modify: `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`
- Modify: `__tests__/app/trainer/plan-template-list.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx
cat __tests__/app/trainer/plan-template-list.test.tsx
```

- [ ] **Step 2: Rewrite plan-template-list.tsx**

```tsx
// src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx
'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import type { IPlanTemplate } from '@/types/training';

interface PlanTemplateListProps {
  templates: IPlanTemplate[];
  onDelete: (id: string) => Promise<void>;
}

export function PlanTemplateList({ templates, onDelete }: PlanTemplateListProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Plan Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <Button asChild className="bg-white text-black hover:bg-white/90 font-semibold">
            <Link href="/dashboard/trainer/plans/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Template
            </Link>
          </Button>
        }
      />

      <div className="px-8 py-7">
        {templates.length === 0 ? (
          <EmptyState
            heading="No templates yet"
            description="Create your first training plan template to assign to members."
            action={
              <Button asChild className="bg-white text-black hover:bg-white/90 font-semibold">
                <Link href="/dashboard/trainer/plans/new">Create Template</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {templates.map((template, i) => (
              <motion.div
                key={template._id.toString()}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex items-center justify-between hover:border-[#2a2a2a] transition-colors">
                  <div>
                    <div className="text-[14px] font-semibold text-white">{template.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className="bg-[#1a1a1a] text-[#555] border-0 text-[10px]">
                        {template.days.length} days
                      </Badge>
                      {template.description && (
                        <span className="text-[11px] text-[#2e2e2e]">{template.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="text-[#333] hover:text-[#888] hover:bg-[#141414]"
                    >
                      <Link href={`/dashboard/trainer/plans/${template._id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(template._id.toString())}
                      className="text-[#333] hover:text-red-400 hover:bg-[#141414]"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update test and run**

```bash
pnpm test -- --testPathPattern=plan-template-list
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx __tests__/app/trainer/plan-template-list.test.tsx
git commit -m "feat: redesign plan template list with action buttons and empty state"
```

---

## Task 14: Trainer — New / Edit Plan Template Form

**Files:**
- Modify: `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`

- [ ] **Step 1: Read existing form component**

```bash
cat src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx
```

- [ ] **Step 2: Rewrite plan-template-form.tsx — replace native inputs with shadcn**

Keep all form state, validation, and submit logic unchanged. Replace:
- `<input type="text">` → `<Input className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white" />`
- `<textarea>` → `<Textarea className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white" />`
- `<button type="submit">` → `<Button className="bg-white text-black hover:bg-white/90 font-semibold">`
- `<button type="button">` (secondary actions) → `<Button variant="ghost" className="border border-[#1a1a1a] text-[#444]">`
- Wrap the form in `PageHeader` with the title "New Template" or "Edit Template"
- Wrap each input group in a `<Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5">`

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx src/app/(dashboard)/trainer/plans/new/page.tsx src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx
git commit -m "feat: redesign plan template form with shadcn inputs and card layout"
```

---

## Task 15: Trainer — Member Plan Assignment Page

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`
- Modify: `__tests__/app/trainer/trainer-member-plan-client.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx
cat __tests__/app/trainer/trainer-member-plan-client.test.tsx
```

- [ ] **Step 2: Rewrite the client component**

Keep all data fetching, plan assignment logic, and API calls. Replace the JSX:
- Use `PageHeader` with title "[Member Name] — Training Plan"
- Use `Select` from shadcn for plan template picker: `<Select className="bg-[#0c0c0c] border-[#1e1e1e]">`
- Use `Card` for the assigned plan summary
- Use `Button` for the assign action

- [ ] **Step 3: Run tests**

```bash
pnpm test -- --testPathPattern=trainer-member-plan
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx __tests__/app/trainer/trainer-member-plan-client.test.tsx
git commit -m "feat: redesign trainer member plan assignment page"
```

---

## Task 16: Trainer — Nutrition Templates List + New / Edit

**Files:**
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/new/_client.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx
cat src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx
```

- [ ] **Step 2: Rewrite nutrition-template-list.tsx**

Apply the same pattern as Task 13 (Plan Templates list):
- `PageHeader` with title "Nutrition Templates" + "New Template" button
- `Card` per template row with edit/delete actions
- `EmptyState` when list is empty
- Staggered Framer Motion entry animation

- [ ] **Step 3: Rewrite nutrition-template-form.tsx**

Apply the same pattern as Task 14 (Plan Template form):
- `Tabs` for day types (Training Day / Rest Day / High Carb etc.)
- `Input` for macro targets (kcal, protein, carbs, fat)
- `Card` per meal section
- Food item search: replace native `<input>` with `<Input className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white">`

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/trainer/nutrition/
git commit -m "feat: redesign nutrition template list and form"
```

---

## Task 17: Trainer — Member Nutrition + Body Tests Pages

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`
- Modify: `__tests__/app/trainer/body-test-client.test.tsx`

- [ ] **Step 1: Read existing files**

```bash
cat src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx
cat src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx
cat __tests__/app/trainer/body-test-client.test.tsx
```

- [ ] **Step 2: Rewrite trainer-member-nutrition-client.tsx**

Keep assign logic. Replace JSX:
- `PageHeader` with "[Member Name] — Nutrition"
- `Select` for plan picker
- `Card` for currently assigned plan summary
- `Button` for assign action

- [ ] **Step 3: Rewrite body-test-client.tsx**

Keep all skinfold form logic, protocol switching, and POST logic. Replace JSX:
- `PageHeader` with "[Member Name] — Body Tests"
- `Select` for protocol picker (3-site / 7-site / 9-site / other)
- Dynamic `Input` fields per protocol (show/hide based on selected protocol — keep existing logic)
- `Card` for form and for each history entry
- `Button` for submit

Label pattern for inputs:
```tsx
<div className="space-y-1.5">
  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
    Tricep (mm)
  </label>
  <Input
    type="number"
    name="tricep"
    className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
    aria-label="Tricep skinfold in mm"
  />
</div>
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Final lint + build check**

```bash
pnpm lint && pnpm build
```

Expected: 0 warnings, 0 errors, successful build.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/trainer/members/
git commit -m "feat: redesign trainer member nutrition and body test pages"
```

---

## Task 18: Final Polish — Run Full Test Suite + Update INDEX.md

**Files:**
- Modify: `docs/INDEX.md`
- Modify: `docs/2026-04-23/plans/frontend-redesign-implementation-plan.md` (mark complete)

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: 100% pass rate, 0 skipped.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: successful build.

- [ ] **Step 4: Update INDEX.md — add implementation plan row**

Add to the Implementation Plans table:

```markdown
| Frontend Redesign (Phase 2) | [frontend-redesign-implementation-plan.md](2026-04-23/plans/frontend-redesign-implementation-plan.md) | Complete |
```

- [ ] **Step 5: Final commit**

```bash
git add docs/INDEX.md docs/2026-04-23/plans/frontend-redesign-implementation-plan.md
git commit -m "docs: mark frontend redesign implementation plan complete"
```
