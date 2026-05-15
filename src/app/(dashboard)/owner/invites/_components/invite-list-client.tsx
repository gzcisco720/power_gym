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
