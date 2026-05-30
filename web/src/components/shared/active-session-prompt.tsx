'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  dayName: string;
  // ISO date strings — both server-rendered.
  startedAtIso: string;
  lastActivityAtIso: string;
  // Where to navigate when user clicks "Continue" — e.g. /trainer/my-training/session/{id}.
  continueHref: string;
  // POST endpoint to seal the session (cross-day Save action).
  sealEndpoint: string;
  // DELETE endpoint to discard.
  deleteEndpoint: string;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function relativeTime(from: Date, now: Date): string {
  const diffMs = now.getTime() - from.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ActiveSessionPrompt({
  dayName,
  startedAtIso,
  lastActivityAtIso,
  continueHref,
  sealEndpoint,
  deleteEndpoint,
}: Props) {
  const { refresh } = useRouter();
  const [busy, setBusy] = useState<'seal' | 'discard' | null>(null);
  const [open, setOpen] = useState(true);

  const startedAt = new Date(startedAtIso);
  const lastActivityAt = new Date(lastActivityAtIso);
  const now = new Date();
  const sameDay = isSameLocalDay(startedAt, now);

  async function seal() {
    setBusy('seal');
    try {
      const res = await fetch(sealEndpoint, { method: 'POST' });
      if (!res.ok) {
        toast.error('Failed to save session');
        return;
      }
      setOpen(false);
      toast.success('Session saved to history');
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    setBusy('discard');
    try {
      const res = await fetch(deleteEndpoint, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to discard');
        return;
      }
      setOpen(false);
      toast.success('Session discarded');
      refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!sameDay) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unfinished workout from {formatDate(startedAt)}</DialogTitle>
            <DialogDescription className="text-foreground/65">
              You started {dayName} but never finished it. Save what you did, or discard the session.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-foreground/5 ring-1 ring-foreground/10 p-3 text-xs text-foreground/65 space-y-1 tabular-nums">
            <div>
              <span className="text-foreground/50">Started:</span>{' '}
              {formatDate(startedAt)} · {relativeTime(startedAt, now)}
            </div>
            <div>
              <span className="text-foreground/50">Last activity:</span>{' '}
              {relativeTime(lastActivityAt, now)}
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void discard()}
              disabled={busy !== null}
            >
              {busy === 'discard' ? 'Discarding…' : 'Discard'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => void seal()}
              disabled={busy !== null}
            >
              {busy === 'seal' ? 'Saving…' : 'Save it'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 px-4 py-3">
      <TriangleAlert className="size-4 shrink-0 mt-0.5 text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-100">
          {dayName} session in progress
        </p>
        <p className="mt-0.5 text-xs text-foreground/65">
          Started {relativeTime(startedAt, now)} · last activity {relativeTime(lastActivityAt, now)}
        </p>
      </div>
      <a
        href={continueHref}
        className="shrink-0 inline-flex items-center rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-500/40 hover:bg-amber-500/30 transition-colors"
      >
        Continue →
      </a>
      <button
        type="button"
        onClick={() => void discard()}
        disabled={busy !== null}
        aria-label="Discard active session"
        className="shrink-0 rounded-md px-2 py-1 text-xs text-foreground/65 hover:text-destructive disabled:opacity-50 transition-colors"
      >
        {busy === 'discard' ? '…' : 'Discard'}
      </button>
    </div>
  );
}
