import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You have an active session</DialogTitle>
          <DialogDescription className="text-foreground/65">
            {dayName} is in progress with {setCount} set{setCount === 1 ? '' : 's'} logged. Resume
            it or discard and start fresh.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <a
            href={resumeHref}
            className="inline-flex items-center justify-center h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Resume session
          </a>
          <Button variant="destructive" onClick={onDeleteAndStart}>
            Discard and start new
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
