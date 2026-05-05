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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainerInviteDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function reset() {
    setEmail('');
    setGeneratedUrl(null);
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset();
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/trainer/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email }),
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
          <DialogTitle className="text-white text-[15px] font-semibold">Invite Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="trainer-invite-email"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
            >
              Email
            </label>
            <Input
              id="trainer-invite-email"
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
