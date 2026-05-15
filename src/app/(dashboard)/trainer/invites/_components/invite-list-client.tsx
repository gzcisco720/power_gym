'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
}

interface Props {
  invites: InviteRow[];
}

export function TrainerInviteListClient({ invites }: Props) {
  const router = useRouter();
  const [revokeTarget, setRevokeTarget] = useState<InviteRow | null>(null);

  const now = new Date();
  const pending = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now);
  const accepted = invites.filter((inv) => inv.usedAt !== null);
  const expired = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now);

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success('Link copied to clipboard');
  }

  async function handleResendOrRegenerate(id: string, context: 'resend' | 'regenerate') {
    try {
      const res = await fetch(`/api/trainer/invites/${id}/resend`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; inviteUrl?: string };
      if (!res.ok) {
        toast.error(data.error ?? `Failed to ${context} invite`);
        return;
      }
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
      }
      toast.success(context === 'resend' ? 'Invite email resent · link copied' : 'New invite link generated · copied');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const id = revokeTarget._id;
    try {
      const res = await fetch(`/api/trainer/invites/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to revoke invite');
        return;
      }
      setRevokeTarget(null);
      toast.success('Invite revoked');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  const daysUntil = (iso: string) => {
    const diff = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
    return diff <= 1 ? 'Expires in 1d' : `Expires in ${diff}d`;
  };
  const expirySoon = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000) <= 2;
  const joinedLabel = (iso: string) =>
    `✓ Joined ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
        <StatCard
          label="Accepted"
          value={String(accepted.length)}
          accentColor={accepted.length > 0 ? 'success' : undefined}
        />
      </div>

      {pending.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] uppercase tracking-[2px] text-primary-light/70 font-semibold mb-2">
            Pending ({pending.length})
          </div>
          <div className="space-y-1.5">
            {pending.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center gap-3 px-4 py-2.5 bg-primary/[.04] ring-1 ring-primary/[.12] rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/80 truncate">
                    {inv.recipientEmail}
                  </div>
                </div>
                <div
                  className={`text-[10px] shrink-0 ${
                    expirySoon(inv.expiresAt) ? 'text-amber-400' : 'text-foreground/50'
                  }`}
                >
                  {daysUntil(inv.expiresAt)}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyLink(inv.token)}
                    className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors"
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendOrRegenerate(inv._id, 'resend')}
                    className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors"
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokeTarget(inv)}
                    className="text-[10px] px-2 py-1 rounded-md bg-red-400/[.06] ring-1 ring-red-400/[.15] text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] uppercase tracking-[2px] text-emerald-400/70 font-semibold mb-2">
            Accepted ({accepted.length})
          </div>
          <div className="space-y-1.5">
            {accepted.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/[.04] ring-1 ring-emerald-500/[.10] rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/80 truncate">
                    {inv.recipientEmail}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-400/80 shrink-0">
                  {joinedLabel(inv.usedAt!)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold mb-2">
            Expired ({expired.length})
          </div>
          <div className="space-y-1.5">
            {expired.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center gap-3 px-4 py-2.5 bg-white/[.015] ring-1 ring-white/[.05] rounded-xl opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground/40 truncate">
                    {inv.recipientEmail}
                  </div>
                </div>
                <div className="text-[10px] text-foreground/25 shrink-0">
                  Expired{' '}
                  {new Date(inv.expiresAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => handleResendOrRegenerate(inv._id, 'regenerate')}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/[.04] ring-1 ring-white/[.08] text-foreground/45 hover:text-foreground/70 transition-colors shrink-0"
                >
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

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke the invite for{' '}
              <span className="font-semibold text-foreground/80">
                {revokeTarget?.recipientEmail}
              </span>
              ? The link will no longer work. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
