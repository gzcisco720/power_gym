'use client';

import { useRouter } from 'next/navigation';
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
    await fetch(`/api/owner/invites/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function handleResend(id: string) {
    const res = await fetch(`/api/owner/invites/${id}/resend`, { method: 'POST' });
    const data = (await res.json()) as { inviteUrl: string };
    await navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined);
    router.refresh();
  }

  function renderRows(rows: InviteRow[], showRevoke: boolean) {
    if (rows.length === 0) {
      return (
        <div className="px-5 py-8 text-center text-[12px] text-[#2a2a2a]">None</div>
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
        <div className="text-[10px] text-[#2a2a2a]">
          {showRevoke ? 'Expires' : 'Expired'}{' '}
          {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResend(inv._id)}
            className="text-[#333] hover:text-[#888] hover:bg-[#141414] text-[10px]"
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
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a] mb-3">
          Pending ({pending.length})
        </h3>
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {renderRows(pending, true)}
        </Card>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a] mb-3">
          Expired ({expired.length})
        </h3>
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {renderRows(expired, false)}
        </Card>
      </div>
    </div>
  );
}
