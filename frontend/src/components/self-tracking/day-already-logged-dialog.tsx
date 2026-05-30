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
  sessionId: string;
  basePath: string;
  onClose: () => void;
  onDeleteLog: () => Promise<void>;
}

export function DayAlreadyLoggedDialog({
  open,
  dayName,
  sessionId,
  basePath,
  onClose,
  onDeleteLog,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Already logged today</DialogTitle>
          <DialogDescription className="text-foreground/65">
            You already logged {dayName} today. View the existing session or delete it and re-log.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <a
            href={`${basePath}/session/${sessionId}`}
            className="inline-flex items-center justify-center h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            View existing session
          </a>
          <Button variant="destructive" onClick={() => void onDeleteLog()}>
            Delete and re-log
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
