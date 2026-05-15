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
      const data = (await res.json()) as { error?: string; inviteUrl?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create invite');
        return;
      }
      setGeneratedUrl(data.inviteUrl ?? null);
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
