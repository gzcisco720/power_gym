import type { BodyMetricsResult } from '@/lib/check-in-stats';

interface Props {
  metrics: BodyMetricsResult;
}

function Delta({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return null;
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs) ? abs.toLocaleString() : abs.toFixed(1);
  if (value < 0) return <div className="text-[11px] mt-0.5 text-red-400">▼ {formatted} {unit}</div>;
  if (value > 0) return <div className="text-[11px] mt-0.5 text-emerald-400">▲ {formatted} {unit}</div>;
  return <div className="text-[11px] mt-0.5 text-foreground/30">no change</div>;
}

function Sparkline({ history }: { history: number[] }) {
  if (history.length < 2) return <div className="h-5 mt-1.5" />;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-0.5 h-5 mt-1.5">
      {history.map((v, i) => {
        const h = Math.max(2, ((v - min) / range) * 20);
        const isLatest = i === history.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${isLatest ? 'bg-primary' : 'bg-primary/40'}`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

const DIET_LABELS: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOURS: Record<string, string> = {
  yes: 'text-emerald-400',
  no: 'text-red-400',
  partial: 'text-amber-400',
};
const DIET_DOT: Record<string, string> = {
  yes: 'bg-emerald-400',
  no: 'bg-red-400',
  partial: 'bg-amber-400/60',
};

export function BodyMetrics({ metrics }: Props) {
  const cells = [
    {
      label: 'Weight',
      value: metrics.weight.current,
      delta: metrics.weight.delta,
      unit: 'kg',
      history: metrics.weight.history,
    },
    {
      label: 'Waist',
      value: metrics.waist.current,
      delta: metrics.waist.delta,
      unit: 'cm',
      history: metrics.waist.history,
    },
    {
      label: 'Steps',
      value: metrics.steps.current,
      delta: metrics.steps.delta,
      unit: '',
      history: metrics.steps.history,
    },
    {
      label: 'Sleep',
      value: metrics.sleepHours.current,
      delta: metrics.sleepHours.delta,
      unit: 'hrs',
      history: metrics.sleepHours.history,
    },
    {
      label: 'Exercise',
      value: metrics.exerciseMinutes.current,
      delta: metrics.exerciseMinutes.delta,
      unit: 'min',
      history: metrics.exerciseMinutes.history,
    },
  ];

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Body Metrics</span>
        <span className="text-[11px] text-foreground/45">vs. first record</span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-foreground/5">
        {cells.map(({ label, value, delta, unit, history }) => (
          <div key={label} className="bg-card px-[15px] py-[13px]">
            <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/35 mb-0.5">{label}</div>
            {value !== null ? (
              <>
                <div className="text-[18px] font-bold leading-none">
                  {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
                  {unit && <span className="text-xs text-foreground/35 font-normal ml-0.5">{unit}</span>}
                </div>
                <Delta value={delta} unit={unit} />
                <Sparkline history={history} />
              </>
            ) : (
              <div className="text-[18px] font-bold text-foreground/25">–</div>
            )}
          </div>
        ))}

        {/* Diet cell */}
        <div className="bg-card px-[15px] py-[13px]">
          <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/35 mb-0.5">Diet</div>
          {metrics.stuckToDiet ? (
            <>
              <div className={`text-sm font-bold mt-0.5 ${DIET_COLOURS[metrics.stuckToDiet]}`}>
                {DIET_LABELS[metrics.stuckToDiet]}
              </div>
              <div className="flex gap-1 mt-1.5">
                {[...metrics.dietHistory].reverse().map((d, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${DIET_DOT[d]}`} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-[18px] font-bold text-foreground/25">–</div>
          )}
        </div>
      </div>
    </div>
  );
}
