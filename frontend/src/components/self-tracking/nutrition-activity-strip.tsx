interface FullProps {
  state: 'full';
  last14Days: boolean[];
  daysThisMonth: number;
  avgKcal: number;
  avgProteinG: number;
}
interface LightProps {
  state: 'light';
  last14Days: boolean[];
  daysLogged: number;
}
interface EmptyProps {
  state: 'empty';
}
type Props = FullProps | LightProps | EmptyProps;

export function NutritionActivityStrip(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Get started
          </span>
          <span className="text-[11px] text-foreground/65">
            Pick a path · Log meals · Complete day
          </span>
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
              className={`w-3 h-3 rounded-[3px] ${on ? 'bg-primary/65' : 'bg-foreground/5'}`}
            />
          ))}
        </div>
      </div>
      {props.state === 'full' ? (
        <div className="flex items-center gap-4 text-[11px] tabular-nums text-foreground/65">
          <span>
            <span className="text-foreground font-semibold">{props.daysThisMonth}</span> days
          </span>
          <span>
            <span className="text-foreground font-semibold">{props.avgKcal}</span> avg kcal
          </span>
          <span>
            <span className="text-foreground font-semibold">{props.avgProteinG}g</span> avg protein
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-foreground/65">
          <span className="text-foreground font-semibold">{props.daysLogged}</span> days logged
        </div>
      )}
    </div>
  );
}
