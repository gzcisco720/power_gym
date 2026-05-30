'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  dayName: string;
  sessionId: string;
  basePath: '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
  onClose: () => void;
  onDeleteLog?: () => Promise<void>;
}

export function DayAlreadyLoggedDialog({ open, dayName, sessionId, basePath, onClose, onDeleteLog }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!onDeleteLog) return;
    setDeleting(true);
    try {
      await onDeleteLog();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="flex flex-col items-center text-center px-6 pt-7 pb-5 gap-3">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-primary" aria-hidden>
              <path d="M4 11.5l5 5 9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground mb-1">
              Already trained today
            </DialogTitle>
            <p className="text-sm text-foreground/65 leading-snug">
              You completed your &ldquo;{dayName}&rdquo; session today.
              <br />
              Rest up. See you tomorrow!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-5">
          <Button onClick={onClose} className="w-full">
            Got it
          </Button>
          <Link
            href={`${basePath}/session/${sessionId}`}
            className="text-center text-sm text-foreground/65 hover:text-foreground transition-colors py-1"
          >
            View session →
          </Link>
        </div>

        {/* Delete escape hatch */}
        {onDeleteLog && (
          <div className="border-t border-foreground/10 px-6 py-4 flex flex-col gap-2.5">
            <p className="text-xs text-foreground/65 text-center leading-relaxed">
              Logged the wrong data? Since each day can only be logged once,
              you can delete your previous log to start fresh.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
            >
              {deleting ? 'Deleting…' : 'Delete previous log'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
