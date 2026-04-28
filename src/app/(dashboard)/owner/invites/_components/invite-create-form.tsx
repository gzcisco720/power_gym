'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  trainers: TrainerOption[];
}

export function InviteCreateForm({ trainers }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<'trainer' | 'member'>('member');
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState(trainers[0]?._id ?? '');
  const [saving, setSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

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
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 space-y-5 max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="invite-role"
            className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]"
          >
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'trainer' | 'member')}
            className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="member">Member</option>
            <option value="trainer">Trainer</option>
          </select>
        </div>

        {role === 'member' && trainers.length > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor="invite-trainer"
              className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]"
            >
              Assign to Trainer
            </label>
            <select
              id="invite-trainer"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {trainers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="invite-email"
            className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]"
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
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
        >
          {saving ? 'Generating...' : 'Generate Invite Link'}
        </Button>
      </form>

      {generatedUrl && (
        <div className="border-t border-[#141414] pt-4 space-y-2">
          <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">
            Invite Link
          </div>
          <div className="break-all text-[11px] text-[#888] bg-[#0a0a0a] border border-[#141414] rounded-lg px-3 py-2">
            {generatedUrl}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(generatedUrl).catch(() => undefined)}
            className="text-[#777] hover:text-[#aaa] text-xs border border-[#1a1a1a]"
          >
            Copy Link
          </Button>
        </div>
      )}
    </Card>
  );
}
