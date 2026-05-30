import Link from 'next/link';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export interface SessionRow {
  id: string;
  dateLabel: string;
  dayName: string;
  setCount: number;
  durationMin: number;
  rpe: number | null;
  hasPR: boolean;
  // Cron sealed this session (idle ≥ 24h with no manual completion).
  autoSealed: boolean;
  // No sets were ever logged — the session was started and abandoned.
  isEmpty: boolean;
}
interface DataProps {
  state: 'full' | 'light';
  sessions: SessionRow[];
  basePath: BasePath;
}
interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
}
type Props = DataProps | EmptyProps;

export function RecentSessionsList(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 flex items-center gap-4">
        <div className="rounded-lg ring-1 ring-foreground/10 bg-foreground/5 p-3 text-[10px] tabular-nums text-foreground/30 leading-snug min-w-[140px]">
          <div className="flex items-center justify-between mb-1">
            <span>Tue</span>
            <span>RPE 7</span>
          </div>
          <div className="text-foreground/65">PPL · Day 2 · Pull</div>
          <div className="mt-0.5">8 sets · 52 min</div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65 mb-1">
            Coming soon
          </p>
          <p className="text-xs text-foreground/65 leading-snug">
            Once you finish your first session, you&apos;ll see a recap row here. Each row shows date, what you trained, set count, duration, and RPE.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">
          Recent sessions
        </span>
        {props.state === 'full' ? (
          <Link href={`${props.basePath}?view=all`} className="text-[11px] text-foreground/65 hover:text-foreground">
            View all →
          </Link>
        ) : (
          <span className="text-[11px] text-foreground/65 tabular-nums">{props.sessions.length} logged</span>
        )}
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 divide-y divide-foreground/5">
        {props.sessions.map((s) => (
          <Link
            key={s.id}
            href={`${props.basePath}/session/${s.id}`}
            className="flex items-center gap-2 px-4 py-2.5 tabular-nums text-[12px] hover:bg-foreground/5"
          >
            <div className="w-12 text-foreground/65 shrink-0">{s.dateLabel}</div>
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <span className="truncate">{s.dayName}</span>
              {s.isEmpty && (
                <span className="rounded px-1 py-0.5 text-[9px] font-semibold tracking-wider bg-foreground/10 text-foreground/65">
                  EMPTY
                </span>
              )}
              {s.autoSealed && (
                <span className="rounded px-1 py-0.5 text-[9px] font-semibold tracking-wider bg-foreground/10 text-foreground/65">
                  AUTO-SAVED
                </span>
              )}
            </div>
            <div className="w-16 text-right text-foreground/65 shrink-0">{s.setCount} sets</div>
            <div className="w-16 text-right text-foreground/65 shrink-0">{s.durationMin} min</div>
            <div className="w-12 text-right text-foreground/65 shrink-0">{s.rpe != null ? `RPE ${s.rpe}` : '—'}</div>
            <div className="w-10 text-right shrink-0">
              {s.hasPR && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30">
                  PR
                </span>
              )}
            </div>
          </Link>
        ))}
        {props.state === 'light' && (
          <div className="flex items-center px-4 py-2.5 text-[11px] text-foreground/40 italic">
            Newer sessions will land here as you log them.
          </div>
        )}
      </div>
    </div>
  );
}
