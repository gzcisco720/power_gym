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
      <DialogContent className="bg-[#0c0c0c] border-[#1a1a1a] text-white max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-[15px] font-semibold">New Invite</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="invite-role"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'trainer' | 'member')}
              className="w-full rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              <option value="member">Member</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>

          {role === 'member' && trainers.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="invite-trainer"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
              >
                Assign to Trainer
              </label>
              <select
                id="invite-trainer"
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="w-full rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
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
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
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
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white focus-visible:ring-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Generating...' : 'Generate Invite Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-[#777] hover:text-[#aaa] text-sm"
            >
              Cancel
            </Button>
          </div>
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
      </DialogContent>
    </Dialog>
  );
}
