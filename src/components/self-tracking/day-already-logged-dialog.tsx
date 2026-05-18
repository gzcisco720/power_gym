import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  dayName: string;
  sessionId: string;
  basePath: '/owner/my-training' | '/trainer/my-training' | '/member/plan' | '/member/my-training';
  onClose: () => void;
}

export function DayAlreadyLoggedDialog({ open, dayName, sessionId, basePath, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Already trained today</DialogTitle>
          <DialogDescription>
            You completed your &ldquo;{dayName}&rdquo; session today. Rest up — see you tomorrow!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Link
            href={`${basePath}/session/${sessionId}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            View session →
          </Link>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
