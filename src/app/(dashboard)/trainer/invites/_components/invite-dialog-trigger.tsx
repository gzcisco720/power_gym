'use client';

import { useState } from 'react';
import { TrainerInviteDialog } from './invite-dialog';

export function TrainerInviteDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
      >
        + Invite Member
      </button>
      <TrainerInviteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
