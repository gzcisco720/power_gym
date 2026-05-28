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
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        + Invite
      </button>
      <InviteDialog open={open} onOpenChange={setOpen} trainers={trainers} />
    </>
  );
}
