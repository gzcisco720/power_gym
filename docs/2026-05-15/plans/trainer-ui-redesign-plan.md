# Trainer UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the owner-side Premium Indigo design system to all trainer-facing list pages, eliminating hardcoded hex, native confirm(), and inconsistent button styles.

**Architecture:** Five focused tasks — Members page split to server+client with KPI strip; Invites full redesign matching owner pattern; Training/Nutrition template cards token-upgraded; Dashboard inline hex replaced with Tailwind classes.

**Tech Stack:** Next.js App Router, Tailwind CSS design tokens, shadcn AlertDialog (already installed), Framer Motion (existing variants)

---

## Design tokens in use (reference for all tasks)

| Element | Class |
|---------|-------|
| Card surface | `bg-white/[.02] ring-1 ring-white/[.06] rounded-xl` |
| Card hover | `hover:ring-white/[.12]` |
| Primary action button | `bg-primary/15 text-primary-light hover:bg-primary/25` (indigo pill) |
| New/submit button | `bg-primary text-primary-foreground hover:bg-primary/90` |
| Secondary text | `text-foreground/65` |
| Dim metadata | `text-foreground/35` |
| Section label | `text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold` |
| Avatar (primary) | `bg-primary/20 text-primary-light` |
| Avatar (gradient) | `bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_12px_rgba(99,102,241,0.3)]` |
| Card divider | `border-foreground/[.06]` |

---

## Task 1: Trainer Members Page

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/_components/trainer-members-client.tsx`
- Modify: `__tests__/app/(dashboard)/trainer/members/page.test.tsx`

### What changes
- Remove `TrainerInviteDialogTrigger` from the members page (it's on the Invites page)
- Add KPI data: `sessionsThisMonth` (sum across all members), `newThisMonth` (members with `createdAt >= startOfMonth`)
- New client component with search input (filter by name/email client-side)
- Each row: indigo avatar + name/email + "View Hub →" indigo pill

- [ ] **Step 1: Update page.tsx — add session repo + KPI computation**

```tsx
// src/app/(dashboard)/trainer/members/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TrainerMembersClient } from './_components/trainer-members-client';

export default async function TrainerMembersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const members = await userRepo.findAllMembers(session.user.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const memberIds = members.map((m) => m._id.toString());
  const [sessionsThisMonth] = await Promise.all([
    sessionRepo.countByMemberIdsSince(memberIds, startOfMonth),
  ]);

  const newThisMonth = members.filter(
    (m) => new Date(m.createdAt) >= startOfMonth,
  ).length;

  const memberRows = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
  }));

  if (members.length === 0) {
    return (
      <div>
        <PageHeader title="Members" subtitle="0 members" />
        <div className="px-4 sm:px-8 py-7">
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${memberRows.length} member${memberRows.length !== 1 ? 's' : ''} assigned to you`}
      />
      <div className="px-4 sm:px-8 py-7">
        <TrainerMembersClient
          members={memberRows}
          totalCount={memberRows.length}
          sessionsThisMonth={sessionsThisMonth}
          newThisMonth={newThisMonth}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run existing page test to confirm it fails (it will — page shape changed)**

```bash
pnpm test "__tests__/app/(dashboard)/trainer/members/page.test.tsx"
```

Expected: FAIL — missing mock for `MongoWorkoutSessionRepository`

- [ ] **Step 3: Create TrainerMembersClient**

```tsx
// src/app/(dashboard)/trainer/members/_components/trainer-members-client.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { initials } from '@/lib/utils';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  members: MemberRow[];
  totalCount: number;
  sessionsThisMonth: number;
  newThisMonth: number;
}

export function TrainerMembersClient({ members, totalCount, sessionsThisMonth, newThisMonth }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Members" value={String(totalCount)} accentColor="primary" />
        <StatCard label="Sessions This Month" value={String(sessionsThisMonth)} />
        <StatCard label="New This Month" value={String(newThisMonth)} accentColor={newThisMonth > 0 ? 'success' : undefined} />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-9 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Section label */}
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
        {filtered.length === totalCount
          ? `All Members (${totalCount})`
          : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
          <p className="text-sm text-foreground/40">No members match your search.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                {initials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{member.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{member.email}</div>
              </div>
              <Link
                href={`/trainer/members/${member._id}`}
                className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors shrink-0"
              >
                View Hub →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Update page test to mock session repo**

```tsx
// __tests__/app/(dashboard)/trainer/members/page.test.tsx
import { render, screen } from '@testing-library/react';
import TrainerMembersPage from '@/app/(dashboard)/trainer/members/page';

jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  usePathname: () => '/trainer/members',
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({
    findAllMembers: jest.fn().mockResolvedValue([
      {
        _id: { toString: () => 'mem1' },
        name: 'Alice Test',
        email: 'alice@test.com',
        createdAt: new Date(),
      },
    ]),
  })),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn().mockImplementation(() => ({
    countByMemberIdsSince: jest.fn().mockResolvedValue(5),
  })),
}));

import { auth } from '@/lib/auth/auth';

beforeEach(() => {
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } });
});

test('renders member list with KPI strip', async () => {
  const ui = await TrainerMembersPage();
  render(ui);
  expect(screen.getByText('Alice Test')).toBeInTheDocument();
  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  expect(screen.getByText('Total Members')).toBeInTheDocument();
  expect(screen.getByText('Sessions This Month')).toBeInTheDocument();
  expect(screen.getByText('New This Month')).toBeInTheDocument();
});

test('renders View Hub link', async () => {
  const ui = await TrainerMembersPage();
  render(ui);
  const link = screen.getByRole('link', { name: /view hub/i });
  expect(link).toHaveAttribute('href', '/trainer/members/mem1');
});
```

- [ ] **Step 5: Run tests and verify pass**

```bash
pnpm test "__tests__/app/(dashboard)/trainer/members/page.test.tsx"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/trainer/members/page.tsx \
        src/app/(dashboard)/trainer/members/_components/trainer-members-client.tsx \
        __tests__/app/(dashboard)/trainer/members/page.test.tsx
git commit -m "feat(trainer/members): add KPI strip, search, View Hub button; remove duplicate Invite button"
```

---

## Task 2: Trainer Invites Redesign

**Files:**
- Modify: `src/app/(dashboard)/trainer/invites/_components/invite-list-client.tsx`
- Modify: `src/app/(dashboard)/trainer/invites/_components/invite-dialog.tsx`
- Modify: `src/app/(dashboard)/trainer/invites/_components/invite-dialog-trigger.tsx`
- Modify: `__tests__/app/trainer/invite-list-client.test.tsx`

### What changes
- `invite-list-client.tsx`: KPI strip (Pending/Accepted), 3 sections (Pending/Accepted/Expired), Copy Link from token, AlertDialog for revoke, full token upgrade
- `invite-dialog.tsx`: indigo submit button, `text-foreground/65` labels, token upgrade throughout
- `invite-dialog-trigger.tsx`: `bg-white text-black` → `bg-primary text-primary-foreground`

- [ ] **Step 1: Write failing test for new invite-list-client behaviour**

```tsx
// __tests__/app/trainer/invite-list-client.test.tsx  (replace existing)
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { TrainerInviteListClient } from '@/app/(dashboard)/trainer/invites/_components/invite-list-client';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

const now = new Date();
const pending = {
  _id: 'i1', token: 'tok-abc', role: 'member' as const,
  recipientEmail: 'a@b.com',
  expiresAt: new Date(now.getTime() + 6 * 86400000).toISOString(),
  usedAt: null, trainerId: 't1',
};
const accepted = {
  _id: 'i3', token: 'tok-used', role: 'member' as const,
  recipientEmail: 'c@d.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
  trainerId: 't1',
};
const expired = {
  _id: 'i2', token: 'tok-xyz', role: 'member' as const,
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null, trainerId: 't1',
};

describe('TrainerInviteListClient', () => {
  it('renders KPI strip with pending and accepted counts', () => {
    render(<TrainerInviteListClient invites={[pending, accepted, expired]} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('renders pending invite email with Copy Link and Resend and Revoke', () => {
    render(<TrainerInviteListClient invites={[pending]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('renders accepted section with joined date', () => {
    render(<TrainerInviteListClient invites={[accepted]} />);
    expect(screen.getByText('c@d.com')).toBeInTheDocument();
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
  });

  it('renders expired row with Regenerate button', () => {
    render(<TrainerInviteListClient invites={[expired]} />);
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('shows AlertDialog when Revoke clicked (no native confirm)', () => {
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('calls DELETE on trainer endpoint when revoke confirmed', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /revoke invite/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/invites/i1', expect.objectContaining({ method: 'DELETE' }))
    );
  });

  it('calls POST on resend and copies link', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=new' }),
    });
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/invites/i1/resend', expect.objectContaining({ method: 'POST' }))
    );
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test "__tests__/app/trainer/invite-list-client.test.tsx"
```

Expected: FAIL — existing component lacks KPI strip, AlertDialog, Copy Link, Accepted section

- [ ] **Step 3: Rewrite invite-list-client.tsx**

```tsx
// src/app/(dashboard)/trainer/invites/_components/invite-list-client.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StatCard } from '@/components/shared/stat-card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InviteRow {
  _id: string;
  token: string;
  role: 'trainer' | 'member';
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
  trainerId: string | null;
}

interface Props {
  invites: InviteRow[];
}

export function TrainerInviteListClient({ invites }: Props) {
  const router = useRouter();
  const now = new Date();
  const [revokeTarget, setRevokeTarget] = useState<InviteRow | null>(null);

  const pending  = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now);
  const accepted = invites.filter((inv) => inv.usedAt !== null);
  const expired  = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now);

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success('Link copied to clipboard');
  }

  async function handleResend(id: string) {
    try {
      const res = await fetch(`/api/trainer/invites/${id}/resend`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; inviteUrl?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed to resend invite'); return; }
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
        toast.success('Invite email resent · link copied');
      }
      router.refresh();
    } catch { toast.error('Something went wrong'); }
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await fetch(`/api/trainer/invites/${id}/resend`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; inviteUrl?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed to regenerate invite'); return; }
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
        toast.success('New invite link generated · copied');
      }
      router.refresh();
    } catch { toast.error('Something went wrong'); }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const id = revokeTarget._id;
    setRevokeTarget(null);
    try {
      const res = await fetch(`/api/trainer/invites/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to revoke invite');
        return;
      }
      toast.success('Invite revoked');
      router.refresh();
    } catch { toast.error('Something went wrong'); }
  }

  const daysUntil = (iso: string) => {
    const diff = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
    return diff <= 1 ? 'Expires in 1d' : `Expires in ${diff}d`;
  };
  const expirySoon = (iso: string) => {
    const diff = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
    return diff <= 2;
  };
  const joinedLabel = (iso: string) =>
    `✓ Joined ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
        <StatCard label="Accepted" value={String(accepted.length)} accentColor={accepted.length > 0 ? 'success' : undefined} />
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] uppercase tracking-[2px] text-primary-light/70 font-semibold mb-2">
            Pending ({pending.length})
          </div>
          <div className="space-y-1.5">
            {pending.map((inv) => (
              <div key={inv._id} className="flex items-center gap-3 px-4 py-2.5 bg-primary/[.04] ring-1 ring-primary/[.12] rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/80 truncate">{inv.recipientEmail}</div>
                </div>
                <div className={`text-[10px] shrink-0 ${expirySoon(inv.expiresAt) ? 'text-amber-400' : 'text-foreground/35'}`}>
                  {daysUntil(inv.expiresAt)}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => copyLink(inv.token)} className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors">
                    Copy Link
                  </button>
                  <button onClick={() => handleResend(inv._id)} className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors">
                    Resend
                  </button>
                  <button onClick={() => setRevokeTarget(inv)} className="text-[10px] px-2 py-1 rounded-md bg-red-400/[.06] ring-1 ring-red-400/[.15] text-red-400/70 hover:text-red-400 transition-colors">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] uppercase tracking-[2px] text-emerald-400/70 font-semibold mb-2">
            Accepted ({accepted.length})
          </div>
          <div className="space-y-1.5">
            {accepted.map((inv) => (
              <div key={inv._id} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/[.04] ring-1 ring-emerald-500/[.10] rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/80 truncate">{inv.recipientEmail}</div>
                </div>
                <div className="text-[10px] text-emerald-400/80 shrink-0">{joinedLabel(inv.usedAt!)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold mb-2">
            Expired ({expired.length})
          </div>
          <div className="space-y-1.5">
            {expired.map((inv) => (
              <div key={inv._id} className="flex items-center gap-3 px-4 py-2.5 bg-white/[.015] ring-1 ring-white/[.05] rounded-xl opacity-70">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/40 truncate">{inv.recipientEmail}</div>
                </div>
                <div className="text-[10px] text-foreground/25 shrink-0">
                  Expired {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <button onClick={() => handleRegenerate(inv._id)} className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors shrink-0">
                  Regenerate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && accepted.length === 0 && expired.length === 0 && (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
          <p className="text-sm text-foreground/40">No invites yet.</p>
        </div>
      )}

      {/* Revoke AlertDialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke the invite for <span className="font-semibold text-foreground/80">{revokeTarget?.recipientEmail}</span>?
              The link will no longer work. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 4: Upgrade invite-dialog.tsx — indigo button + token labels**

Replace the following in `src/app/(dashboard)/trainer/invites/_components/invite-dialog.tsx`:

```tsx
// DialogContent: remove hardcoded bg/border
// Before:
className="bg-[#0c0c0c] border-[#1a1a1a] text-white max-w-md w-full"
// After:
className="max-w-md w-full"

// Label: before
className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
// After:
className="text-xs font-semibold uppercase tracking-wide text-foreground/65"

// Input: before
className="bg-[#0a0a0a] border-[#1e1e1e] text-white focus-visible:ring-white"
// After: (remove override — Input defaults are already correct)
className=""

// Submit button: before
className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
// After:
className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm disabled:opacity-50"

// Cancel button: before
className="text-[#777] hover:text-[#aaa] text-sm"
// After:
className="text-foreground/40 hover:text-foreground/70 text-sm"

// Generated URL section border: before
className="border-t border-[#141414] pt-4 space-y-2"
// After:
className="border-t border-foreground/[.06] pt-4 space-y-2"

// URL label: before
className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]"
// After:
className="text-[9px] font-semibold uppercase tracking-[2px] text-foreground/35"

// URL display box: before
className="break-all text-[11px] text-[#888] bg-[#0a0a0a] border border-[#141414] rounded-lg px-3 py-2"
// After:
className="break-all text-[11px] text-foreground/50 bg-white/[.03] ring-1 ring-white/[.07] rounded-lg px-3 py-2"

// Copy Link button: before
className="text-[#777] hover:text-[#aaa] text-xs border border-[#1a1a1a]"
// After:
className="text-foreground/45 hover:text-foreground/70 text-xs ring-1 ring-white/[.08]"
```

- [ ] **Step 5: Upgrade invite-dialog-trigger.tsx — white → indigo**

```tsx
// src/app/(dashboard)/trainer/invites/_components/invite-dialog-trigger.tsx
// Before:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
// After:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
```

- [ ] **Step 6: Run tests and verify pass**

```bash
pnpm test "__tests__/app/trainer/invite-list-client.test.tsx"
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/trainer/invites/_components/ \
        __tests__/app/trainer/invite-list-client.test.tsx
git commit -m "feat(trainer/invites): redesign with KPI strip, 3 sections, AlertDialog revoke, indigo buttons"
```

---

## Task 3: Training Templates Token Upgrade

**Files:**
- Modify: `src/components/shared/plan-template-list.tsx` OR `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`
  - Check actual path: `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`

- [ ] **Step 1: Apply all token replacements**

In `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`:

```tsx
// New Template button — before:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
// After:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"

// Same replacement in EmptyState action button (same className)

// Card link — before:
className={`block h-full rounded-xl border border-[#141414] border-t-2 ${accent} bg-[#0c0c0c] p-4 pr-11 transition-colors hover:border-[#2a2a2a]`}
// After:
className={`block h-full rounded-xl bg-white/[.02] ring-1 ring-white/[.06] border-t-2 ${accent} p-4 pr-11 transition-all hover:ring-white/[.14]`}

// Description text — before:
<p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] text-[#888]">
// After:
<p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] text-foreground/45">

// No description italic — before:
<p className="mt-1 min-h-[2.4em] text-[12px] italic text-[#444]">
// After:
<p className="mt-1 min-h-[2.4em] text-[12px] italic text-foreground/20">

// No days italic — before:
<div className="mt-3 text-[10px] italic text-[#444]">
// After:
<div className="mt-3 text-[10px] italic text-foreground/20">

// Stats divider — before:
<div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1a1a1a] pt-3 text-center">
// After:
<div className="mt-3 grid grid-cols-2 gap-2 border-t border-foreground/[.06] pt-3 text-center">

// Delete button — before:
className="absolute right-2 top-2 size-8 text-[#777] hover:bg-[#141414] hover:text-red-400"
// After:
className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
```

- [ ] **Step 2: Run existing plan-template-list tests**

```bash
pnpm test "__tests__/app/trainer/plan-template-list"
```

Expected: all PASS (purely visual changes, no logic change)

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx
git commit -m "fix(trainer/plans): replace hardcoded hex with design tokens, indigo New Template button"
```

---

## Task 4: Nutrition Templates Token Upgrade

**Files:**
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`

- [ ] **Step 1: Apply token replacements** (same pattern as Task 3)

In `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`:

```tsx
// New Template button — before:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
// After:
className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"

// Same in EmptyState action button

// Card link — before:
className={`block h-full rounded-xl border border-[#141414] border-t-2 ${accent} bg-[#0c0c0c] p-4 pr-11 transition-colors hover:border-[#2a2a2a]`}
// After:
className={`block h-full rounded-xl bg-white/[.02] ring-1 ring-white/[.06] border-t-2 ${accent} p-4 pr-11 transition-all hover:ring-white/[.14]`}

// Description — before: text-[#888] / After: text-foreground/45
// No description — before: text-[#444] / After: text-foreground/20
// No day types — before: text-[#444] / After: text-foreground/20

// Macro divider — before:
<div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#1a1a1a] pt-3 text-center">
// After:
<div className="mt-3 grid grid-cols-4 gap-2 border-t border-foreground/[.06] pt-3 text-center">

// Delete button — before:
className="absolute right-2 top-2 size-8 text-[#777] hover:bg-[#141414] hover:text-red-400"
// After:
className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
```

- [ ] **Step 2: Run existing nutrition-template-list tests**

```bash
pnpm test "__tests__/app/trainer/nutrition-template-list"
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx
git commit -m "fix(trainer/nutrition): replace hardcoded hex with design tokens, indigo New Template button"
```

---

## Task 5: Dashboard Inline Hex Fixes

**Files:**
- Modify: `src/app/(dashboard)/trainer/_components/trainer-compliance.tsx`
- Modify: `src/app/(dashboard)/trainer/_components/trainer-my-training-card.tsx`

### trainer-compliance.tsx

- [ ] **Step 1: Replace inline hex with Tailwind conditional classes**

```tsx
// Before (inside rows.map):
const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
// ...
<div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
// ...
<div className="text-[12px] font-bold flex-shrink-0" style={{ color }}>{pct}%</div>

// After:
const barClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive';
const txtClass = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-destructive';
// ...
<div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
// ...
<div className={`text-[12px] font-bold flex-shrink-0 ${txtClass}`}>{pct}%</div>
```

### trainer-my-training-card.tsx

- [ ] **Step 2: Replace inline hex gradient and RGBA values**

Find and replace in `src/app/(dashboard)/trainer/_components/trainer-my-training-card.tsx`:

```tsx
// Flame icon container — before:
style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
// After (add to className, remove style):
className="... bg-gradient-to-br from-amber-400 to-red-500"

// Active heatmap dot — before:
'rgba(99,102,241,0.55)'   // used as background value
// After: replace with className="bg-primary/[.55]"

// Inactive heatmap dot — before:
'rgba(255,255,255,0.05)'
// After: className="bg-white/[.04]"
```

- [ ] **Step 3: Run full test suite to confirm nothing broke**

```bash
pnpm test
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/trainer/_components/trainer-compliance.tsx \
        src/app/(dashboard)/trainer/_components/trainer-my-training-card.tsx
git commit -m "fix(trainer/dashboard): replace inline hex with Tailwind design tokens"
```

---

## Final verification

- [ ] `pnpm test` — all pass
- [ ] `pnpm lint` — clean
- [ ] `pnpm build` — clean
- [ ] `git push`
