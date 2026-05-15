# Invites Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the owner Invites page with Indigo Premium tokens, a 3-section list (Pending/Accepted/Expired), visible role badges, KPI strip, Copy Link on pending rows, Regenerate label on expired rows, shadcn AlertDialog revoke confirmation, and an upgraded invite dialog with role toggle pills.

**Architecture:** Two client components are replaced entirely (`InviteListClient`, `InviteDialog`). `InviteDialogTrigger` gets a button style upgrade. `page.tsx` is unchanged — all new data (KPI counts, accepted section) is derived client-side from the existing `invites` prop. AlertDialog is installed first as a new shadcn component.

**Tech Stack:** Next.js App Router, shadcn AlertDialog (new), shadcn Dialog (existing), Tailwind v4 tokens, Framer Motion (none needed).

---

## File Map

### Modified
- `src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx` — full rewrite
- `src/app/(dashboard)/owner/invites/_components/invite-dialog.tsx` — full rewrite
- `src/app/(dashboard)/owner/invites/_components/invite-dialog-trigger.tsx` — button style only
- `__tests__/app/owner/invite-list-client.test.tsx` — update for new sections + AlertDialog + Copy Link
- `__tests__/app/owner/invites/invite-dialog.test.tsx` — update for toggle pills

### Created
- `src/components/ui/alert-dialog.tsx` — shadcn install

---

## Task 1: Install AlertDialog + rewrite InviteListClient

**Files:**
- Run: `pnpm dlx shadcn@latest add alert-dialog`
- Modify: `src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx`
- Modify: `__tests__/app/owner/invite-list-client.test.tsx`

- [ ] **Step 1: Install shadcn AlertDialog**

```bash
pnpm dlx shadcn@latest add alert-dialog
```
Expected: creates `src/components/ui/alert-dialog.tsx`.

- [ ] **Step 2: Update the test file first**

Replace entire `__tests__/app/owner/invite-list-client.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteListClient } from '@/app/(dashboard)/owner/invites/_components/invite-list-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

const now = new Date();

const pending: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i1',
  token: 'tok-abc',
  role: 'member',
  recipientEmail: 'a@b.com',
  expiresAt: new Date(now.getTime() + 86400000 * 3).toISOString(),
  usedAt: null,
  trainerId: null,
};

const expired: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i2',
  token: 'tok-xyz',
  role: 'trainer',
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null,
  trainerId: null,
};

const accepted: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i3',
  token: 'tok-used',
  role: 'member',
  recipientEmail: 'c@d.com',
  expiresAt: new Date(now.getTime() + 86400000).toISOString(),
  usedAt: new Date(now.getTime() - 86400000).toISOString(),
  trainerId: null,
};

describe('InviteListClient', () => {
  it('renders pending invite email', () => {
    render(<InviteListClient invites={[pending, expired]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('shows trainer name in meta when invitedByMap provided', () => {
    render(
      <InviteListClient
        invites={[{ ...pending, invitedBy: 't1' }]}
        invitedByMap={{ t1: 'Li Wei' }}
      />,
    );
    expect(screen.getByText(/Li Wei/)).toBeInTheDocument();
  });

  it('renders Accepted section for used invites', () => {
    render(<InviteListClient invites={[accepted]} />);
    expect(screen.getByText('c@d.com')).toBeInTheDocument();
    expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
  });

  it('shows Copy Link and Resend buttons on pending rows', () => {
    render(<InviteListClient invites={[pending]} />);
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend/i })).toBeInTheDocument();
  });

  it('shows Regenerate button on expired rows (not Resend)', () => {
    render(<InviteListClient invites={[expired]} />);
    expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resend$/i })).not.toBeInTheDocument();
  });

  it('Copy Link writes token URL to clipboard without API call', () => {
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy Link/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('tok-abc'),
    );
  });

  it('opens AlertDialog on Revoke click, calls DELETE on confirm', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    // AlertDialog should now be open
    const confirmBtn = await screen.findByRole('button', { name: /Confirm Revoke/i });
    fireEvent.click(confirmBtn);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/invites/i1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('calls POST resend on Resend click', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=new' }),
    });
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Resend/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/invites/i1/resend',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern=invite-list-client
```
Expected: FAIL — Copy Link/Accepted/AlertDialog behaviours not yet implemented.

- [ ] **Step 4: Write the new InviteListClient**

Replace entire `src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx`:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InviteRow {
  _id: string;
  token: string;
  role: 'trainer' | 'member';
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
  trainerId: string | null;
  invitedBy?: string;
}

interface Props {
  invites: InviteRow[];
  invitedByMap?: Record<string, string>;
}

const roleBadgeClass: Record<'trainer' | 'member', string> = {
  trainer: 'bg-primary/15 text-primary-light',
  member:  'bg-emerald-500/15 text-emerald-400',
};

function expiryLabel(isoDate: string): string {
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Expires today';
  if (days === 1) return 'Expires in 1d';
  return `Expires in ${days}d`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function InviteListClient({ invites, invitedByMap }: Props) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<InviteRow | null>(null);
  const now = useMemo(() => new Date(), []);

  const pending  = useMemo(() => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now), [invites, now]);
  const accepted = useMemo(() => invites.filter((inv) => !!inv.usedAt), [invites]);
  const expired  = useMemo(() => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now), [invites, now]);

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success('Link copied to clipboard');
  }

  async function handleResend(id: string) {
    try {
      const res = await fetch(`/api/owner/invites/${id}/resend`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to resend invite');
        return;
      }
      toast.success('Invite email resent');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await fetch(`/api/owner/invites/${id}/resend`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to regenerate invite');
        return;
      }
      const data = (await res.json()) as { inviteUrl: string };
      await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
      toast.success('New link copied to clipboard');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    try {
      const res = await fetch(`/api/owner/invites/${revoking._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to revoke invite');
        return;
      }
      toast.success('Invite revoked');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRevoking(null);
    }
  }

  function RoleBadge({ role }: { role: 'trainer' | 'member' }) {
    return (
      <span className={`text-[9px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded flex-shrink-0 ${roleBadgeClass[role]}`}>
        {role}
      </span>
    );
  }

  function MetaLine({ inv }: { inv: InviteRow }) {
    const trainerName = inv.invitedBy && invitedByMap?.[inv.invitedBy];
    if (inv.role === 'member' && trainerName) {
      return <div className="text-[10px] text-foreground/35 mt-0.5">Assigned to {trainerName}</div>;
    }
    if (trainerName) {
      return <div className="text-[10px] text-foreground/35 mt-0.5">via {trainerName}</div>;
    }
    return null;
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
        <StatCard label="Accepted" value={String(accepted.length)} accentColor="success" />
        <StatCard label="Expired" value={String(expired.length)} />
      </div>

      <div className="space-y-8">

        {/* Pending */}
        <div>
          <div className="text-[9px] uppercase tracking-[2px] text-primary-light font-semibold mb-3">
            Pending ({pending.length})
          </div>
          {pending.length === 0 ? (
            <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
              <p className="text-sm text-foreground/40">No pending invites</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pending.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 px-4 py-3 bg-primary/[.03] ring-1 ring-primary/[.1] rounded-xl"
                >
                  <RoleBadge role={inv.role} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/85 truncate">{inv.recipientEmail}</div>
                    <MetaLine inv={inv} />
                  </div>
                  <span className="text-[10px] text-foreground/35 shrink-0">{expiryLabel(inv.expiresAt)}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(inv.token)}
                      className="text-foreground/50 hover:text-foreground/80 hover:bg-white/[.06] text-xs h-7 px-2"
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(inv._id)}
                      className="text-foreground/50 hover:text-foreground/80 hover:bg-white/[.06] text-xs h-7 px-2"
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevoking(inv)}
                      className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted */}
        {accepted.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-[2px] text-emerald-400 font-semibold mb-3">
              Accepted ({accepted.length})
            </div>
            <div className="space-y-1.5">
              {accepted.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 px-4 py-3 bg-emerald-500/[.03] ring-1 ring-emerald-500/[.1] rounded-xl"
                >
                  <RoleBadge role={inv.role} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/85 truncate">{inv.recipientEmail}</div>
                    <MetaLine inv={inv} />
                  </div>
                  <span className="text-[10px] text-emerald-400/70 shrink-0">
                    ✓ Joined {formatDate(inv.usedAt!)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired */}
        <div>
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold mb-3">
            Expired ({expired.length})
          </div>
          {expired.length === 0 ? (
            <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
              <p className="text-sm text-foreground/40">No expired invites</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {expired.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/[.015] ring-1 ring-white/[.05] rounded-xl opacity-60"
                >
                  <RoleBadge role={inv.role} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/50 truncate">{inv.recipientEmail}</div>
                    <MetaLine inv={inv} />
                  </div>
                  <span className="text-[10px] text-foreground/25 shrink-0">Expired {formatDate(inv.expiresAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRegenerate(inv._id)}
                    className="text-foreground/40 hover:text-foreground/70 hover:bg-white/[.06] text-xs h-7 px-2 shrink-0"
                  >
                    Regenerate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Revoke AlertDialog */}
      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The link sent to <strong>{revoking?.recipientEmail}</strong> will no longer work.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=invite-list-client
```
Expected: PASS — 8 tests.

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add \
  src/components/ui/alert-dialog.tsx \
  "src/app/(dashboard)/owner/invites/_components/invite-list-client.tsx" \
  __tests__/app/owner/invite-list-client.test.tsx
git commit -m "feat(invites): redesign InviteListClient — KPI strip, 3 sections, role badges, Copy Link, AlertDialog revoke"
```

---

## Task 2: Upgrade InviteDialog + InviteDialogTrigger

**Files:**
- Modify: `src/app/(dashboard)/owner/invites/_components/invite-dialog.tsx`
- Modify: `src/app/(dashboard)/owner/invites/_components/invite-dialog-trigger.tsx`
- Modify: `__tests__/app/owner/invites/invite-dialog.test.tsx`

- [ ] **Step 1: Update the dialog test first**

Replace entire `__tests__/app/owner/invites/invite-dialog.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteDialog } from '@/app/(dashboard)/owner/invites/_components/invite-dialog';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockTrainers = [{ _id: 't1', name: 'Li Wei' }];

describe('InviteDialog', () => {
  const onOpenChange = jest.fn();
  beforeEach(() => jest.clearAllMocks());

  it('renders role toggle buttons and email input when open', () => {
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    expect(screen.getByRole('button', { name: /Member/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trainer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('does not render form content when closed', () => {
    render(<InviteDialog open={false} trainers={mockTrainers} onOpenChange={onOpenChange} />);
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument();
  });

  it('shows trainer selector when member role is selected', () => {
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    // Member is default — trainer selector should be visible
    expect(screen.getByLabelText(/Assign to Trainer/i)).toBeInTheDocument();
  });

  it('hides trainer selector when trainer role is selected', () => {
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Trainer$/i }));
    expect(screen.queryByLabelText(/Assign to Trainer/i)).not.toBeInTheDocument();
  });

  it('calls toast.success when invite is created successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ inviteUrl: 'http://localhost:3000/register?token=abc' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invite link generated'));
  });

  it('shows generated invite URL after success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=tok' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@gym.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect(screen.getByText(/register\?token=tok/)).toBeInTheDocument());
  });

  it('calls toast.error with server message when creation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already invited' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email already invited'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=invite-dialog
```
Expected: FAIL — role toggle buttons not yet implemented.

- [ ] **Step 3: Rewrite invite-dialog.tsx**

Replace entire `src/app/(dashboard)/owner/invites/_components/invite-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainers: TrainerOption[];
}

export function InviteDialog({ open, onOpenChange, trainers }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<'trainer' | 'member'>('member');
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState(trainers[0]?._id ?? '');
  const [saving, setSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function reset() {
    setRole('member');
    setEmail('');
    setTrainerId(trainers[0]?._id ?? '');
    setGeneratedUrl(null);
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset();
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, string> = { role, recipientEmail: email };
    if (role === 'member' && trainerId) body.trainerId = trainerId;

    try {
      const res = await fetch('/api/owner/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to create invite');
        return;
      }
      const data = (await res.json()) as { inviteUrl: string };
      setGeneratedUrl(data.inviteUrl);
      toast.success('Invite link generated');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>New Invite</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Role toggle pills */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
              Role
            </div>
            <div className="flex gap-2">
              {(['member', 'trainer'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 h-9 rounded-lg text-sm font-semibold capitalize transition-all',
                    role === r
                      ? 'bg-primary/20 ring-1 ring-primary/40 text-primary-light'
                      : 'bg-white/[.03] ring-1 ring-white/[.08] text-foreground/40 hover:text-foreground/65',
                  )}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Trainer selector (member only) */}
          {role === 'member' && trainers.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="invite-trainer"
                className="text-xs font-semibold uppercase tracking-wide text-foreground/65"
              >
                Assign to Trainer
              </label>
              <select
                id="invite-trainer"
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-3 text-sm text-foreground/80 focus:outline-none focus:ring-white/20 transition-all"
              >
                {trainers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="invite-email"
              className="text-xs font-semibold uppercase tracking-wide text-foreground/65"
            >
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Generating...' : 'Generate Invite Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-foreground/65 hover:text-foreground/80 text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>

        {generatedUrl && (
          <div className="border-t border-foreground/[.06] pt-4 space-y-2">
            <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/35">
              Invite Link
            </div>
            <div className="break-all text-[11px] text-foreground/65 bg-white/[.03] ring-1 ring-white/[.07] rounded-lg px-3 py-2">
              {generatedUrl}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(generatedUrl).catch(() => undefined)}
              className="text-foreground/50 hover:text-foreground/80 text-xs ring-1 ring-white/[.08] hover:ring-white/20"
            >
              Copy Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Upgrade invite-dialog-trigger.tsx button style**

Replace entire `src/app/(dashboard)/owner/invites/_components/invite-dialog-trigger.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { InviteDialog } from './invite-dialog';

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  trainers: TrainerOption[];
}

export function InviteDialogTrigger({ trainers }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        + Invite
      </button>
      <InviteDialog open={open} onOpenChange={setOpen} trainers={trainers} />
    </>
  );
}
```

- [ ] **Step 5: Run dialog tests to verify they pass**

```bash
pnpm test -- --testPathPattern=invite-dialog
```
Expected: PASS — 6 tests.

- [ ] **Step 6: Run full test suite + lint**

```bash
pnpm test && pnpm lint
```
Expected: all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add \
  "src/app/(dashboard)/owner/invites/_components/invite-dialog.tsx" \
  "src/app/(dashboard)/owner/invites/_components/invite-dialog-trigger.tsx" \
  "__tests__/app/owner/invites/invite-dialog.test.tsx"
git commit -m "feat(invites): upgrade InviteDialog to role toggle pills + Indigo tokens, update trigger button"
```
