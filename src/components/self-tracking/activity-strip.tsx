interface FullProps {
  state: 'full';
  last14Days: boolean[];
  monthStats: { sessions: number; sets: number; avgRpe: number; prs: number };
}
interface LightProps {
  state: 'light';
  last14Days: boolean[];
  sessionCount: number;
}
interface EmptyProps {
  state: 'empty';
}
type Props = FullProps | LightProps | EmptyProps;

export function ActivityStrip(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Get started
          </span>
          <span className="text-[11px] text-foreground/65">3 quick steps · ~30s</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Step n={1} label="Pick a path" />
          <span className="text-foreground/30">›</span>
          <Step n={2} label="Log sets" />
          <span className="text-foreground/30">›</span>
          <Step n={3} label="Mark complete" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
          Last 14 days
        </span>
        <div className="flex gap-[3px]">
          {props.last14Days.map((on, i) => (
            <div
              key={i}
              className={`size-3 rounded-[3px] ${on ? 'bg-emerald-500/65' : 'bg-foreground/5'}`}
            />
          ))}
        </div>
      </div>
      {props.state === 'full' ? (
        <div className="flex items-center gap-4 text-[11px] tabular-nums text-foreground/65">
          <span>
            <span className="text-foreground font-semibold">{props.monthStats.sessions}</span> sessions
          </span>
          <span>
            <span className="text-foreground font-semibold">{props.monthStats.sets}</span> sets
          </span>
          <span>
            <span className="text-foreground font-semibold">{props.monthStats.avgRpe.toFixed(1)}</span> avg RPE
          </span>
          <span className="text-amber-300/90">
            <span className="font-semibold">{props.monthStats.prs}</span> PRs
          </span>
        </div>
      ) : (
        <div className="text-[11px] tabular-nums text-foreground/65">
          <span className="text-foreground font-semibold">{props.sessionCount}</span> sessions
          <span className="text-foreground/30"> · </span>
          <span>Build a streak. Log today.</span>
        </div>
      )}
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground/65">
      <span className="size-4 rounded-full ring-1 ring-foreground/10 text-[9px] tabular-nums font-bold flex items-center justify-center">
        {n}
      </span>
      {label}
    </div>
  );
}
