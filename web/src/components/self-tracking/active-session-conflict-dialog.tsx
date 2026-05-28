'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  dayName: string;
  setCount: number;
  resumeHref: string;
  onDeleteAndStart: () => void;
  onClose: () => void;
}

export function ActiveSessionConflictDialog({
  open,
  dayName,
  setCount,
  resumeHref,
  onDeleteAndStart,
  onClose,
}: Props) {
  const hasData = setCount > 0;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>&ldquo;{dayName}&rdquo; is still in progress</DialogTitle>
          <DialogDescription>
            {hasData
              ? `You have ${setCount} set${setCount === 1 ? '' : 's'} logged. Starting a new session will permanently delete this data.`
              : 'This session has no sets logged yet. Starting a new session will delete it.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <a
            href={resumeHref}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-8 gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Resume &ldquo;{dayName}&rdquo;
          </a>
          <Button variant="destructive" onClick={onDeleteAndStart}>
            Delete &amp; Start New
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
