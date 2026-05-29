import { frequencyBuckets } from '@/lib/training/session-stats';
import type { WorkoutSession } from '@/api/training';

interface MemberTrainingFrequencyProps {
  sessions: WorkoutSession[];
  referenceNow?: Date;
}

function intensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary';
}

function weekLabel(weekStart: Date): string {
  return weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function MemberTrainingFrequency({
  sessions,
  referenceNow,
}: MemberTrainingFrequencyProps) {
  const buckets = frequencyBuckets(sessions, referenceNow);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Training Frequency
      </p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {buckets.map((bucket) => (
          <div key={bucket.weekStart.getTime()} className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              data-testid="freq-cell"
              className={`size-7 rounded ${intensityClass(bucket.count)}`}
              title={`${weekLabel(bucket.weekStart)}: ${bucket.count} session${bucket.count === 1 ? '' : 's'}`}
            />
            <span className="text-[9px] text-foreground/40 whitespace-nowrap">
              {weekLabel(bucket.weekStart)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-muted" />
          <span className="text-[9px] text-foreground/40">0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-primary/30" />
          <span className="text-[9px] text-foreground/40">1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-primary/60" />
          <span className="text-[9px] text-foreground/40">2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-primary" />
          <span className="text-[9px] text-foreground/40">3+</span>
        </div>
      </div>
    </div>
  );
}
