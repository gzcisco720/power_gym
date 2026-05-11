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
          <Button variant="outline" asChild>
            <a href={resumeHref}>Resume &ldquo;{dayName}&rdquo;</a>
          </Button>
          <Button variant="destructive" onClick={onDeleteAndStart}>
            Delete &amp; Start New
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
