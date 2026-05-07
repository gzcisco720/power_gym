interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
}

export function StatCard({ label, value, unit, delta }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-foreground/65">{unit}</span>
        )}
      </div>
      {delta && (
        <div className="mt-1.5 text-xs text-foreground/65">{delta}</div>
      )}
    </div>
  );
}
