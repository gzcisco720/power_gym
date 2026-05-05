'use client';

import { useState } from 'react';
import { InviteDialog } from './invite-dialog';

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  trainers: TrainerOption[];
}

export function InviteDialogTrigger({ trainers }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
      >
        + Invite
      </button>
      <InviteDialog open={open} onOpenChange={setOpen} trainers={trainers} />
    </>
  );
}
