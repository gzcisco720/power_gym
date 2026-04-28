'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export function InviteListClient({ invites }: Props) {
  const router = useRouter();
  const now = new Date();

  const pending = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now);
  const expired = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now);

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this invite? The link will no longer work.')) return;
    try {
      const res = await fetch(`/api/owner/invites/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to revoke invite');
        return;
      }
      toast.success('Invite revoked');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function handleResend(id: string) {
    try {
      const res = await fetch(`/api/owner/invites/${id}/resend`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to resend invite');
        return;
      }
      const data = (await res.json()) as { inviteUrl: string };
      await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
      toast.success('Link copied to clipboard');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  function renderRows(rows: InviteRow[], showRevoke: boolean) {
    if (rows.length === 0) {
      return (
        <div className="px-5 py-8 text-center text-[12px] text-[#555]">None</div>
      );
    }
    return rows.map((inv) => (
      <div
        key={inv._id}
        className="flex items-center gap-3 border-b border-[#0f0f0f] px-5 py-3.5 last:border-0"
      >
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border bg-[#0f0f1f] text-[#2a2a6a] border-[#1a1a3a]">
          {inv.role}
        </span>
        <div className="flex-1">
          <div className="text-[13px] text-[#888]">{inv.recipientEmail}</div>
        </div>
        <div className="text-[10px] text-[#555]">
          {showRevoke ? 'Expires' : 'Expired'}{' '}
          {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResend(inv._id)}
            className="text-[#777] hover:text-[#aaa] hover:bg-[#141414] text-[10px]"
          >
            Resend
          </Button>
          {showRevoke && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(inv._id)}
              className="text-[#2a1111] hover:text-red-400 hover:bg-[#141414] text-[10px]"
            >
              Revoke
            </Button>
          )}
        </div>
      </div>
    ));
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
          Pending ({pending.length})
        </h3>
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {renderRows(pending, true)}
        </Card>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
          Expired ({expired.length})
        </h3>
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {renderRows(expired, false)}
        </Card>
      </div>
    </div>
  );
}
