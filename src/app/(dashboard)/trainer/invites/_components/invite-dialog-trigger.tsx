'use client';

import { useState } from 'react';
import { TrainerInviteDialog } from './invite-dialog';

export function TrainerInviteDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        + Invite Member
      </button>
      <TrainerInviteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
