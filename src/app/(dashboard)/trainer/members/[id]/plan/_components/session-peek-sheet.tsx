'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ArrowUpRight } from 'lucide-react';
import type { SessionSummary } from '@/lib/training/session-summary';
import { useMemberHub } from '../../_components/member-hub-provider';

interface Props {
  memberId: string;
  session: SessionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionPeekSheet({ session, open, onOpenChange }: Props) {
  const { basePath } = useMemberHub();
  if (!session) return null;

  const date = new Date(session.startedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isActive = session.completedAt === null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-l border-border/60 px-5 pb-6 pt-5 w-full sm:max-w-md flex flex-col gap-5"
      >
        <div>
          <SheetTitle className="text-base font-semibold text-foreground">
            {session.dayName}
          </SheetTitle>
          <p className="mt-0.5 text-xs text-foreground/65">{date}</p>
          {isActive && (
            <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30">
              Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">
              Exercises
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.exerciseCount}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">
              Sets
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.setCount}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">
              Volume
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.totalVolume.toLocaleString()}
              <span className="ml-1 text-xs font-medium text-foreground/65">kg</span>
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <a
            href={`${basePath}/log/${session._id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Open in full view
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
