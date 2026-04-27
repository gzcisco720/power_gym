'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Scope = 'one' | 'future' | 'all';

interface RecurringScopeDialogProps {
  open: boolean;
  onConfirm: (scope: Scope) => void;
  onCancel: () => void;
}

const OPTIONS: { scope: Scope; label: string; description: string }[] = [
  {
    scope: 'one',
    label: 'This occurrence only',
    description: 'Only this single session is affected.',
  },
  {
    scope: 'future',
    label: 'This and all future occurrences',
    description: 'This session and every following session in the series.',
  },
  {
    scope: 'all',
    label: 'All occurrences',
    description: 'The entire series, including past sessions.',
  },
];

export function RecurringScopeDialog({
  open,
  onConfirm,
  onCancel,
}: RecurringScopeDialogProps) {
  const [selected, setSelected] = useState<Scope>('one');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit recurring session</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 my-2">
          {OPTIONS.map(({ scope, label, description }) => (
            <button
              key={scope}
              onClick={() => setSelected(scope)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selected === scope
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-[#222] hover:border-[#333]'
              }`}
            >
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs text-[#555] mt-0.5">{description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selected)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
