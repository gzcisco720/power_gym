import type { HeatmapCell } from '@/lib/check-in-stats';

interface Props {
  cells: HeatmapCell[];
}

function cellBg(cell: HeatmapCell): string {
  if (cell.isCurrentWeek && !cell.hasCheckIn) {
    return 'bg-amber-400/35 border border-dashed border-amber-400/55';
  }
  if (!cell.hasCheckIn) return 'bg-foreground/[0.08]';
  const v = cell.avgWellness ?? 5;
  if (v >= 8) return 'bg-primary';
  if (v >= 6.5) return 'bg-primary/70';
  return 'bg-primary/40';
}

export function ConsistencyHeatmap({ cells }: Props) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/28 mb-1.5">
        Consistency
      </div>
      <div className="flex gap-[3px] flex-nowrap overflow-hidden">
        {cells.map((cell, i) => (
          <div
            key={i}
            data-heatmap-cell
            className={`w-[9px] h-[9px] rounded-sm flex-shrink-0 ${cellBg(cell)}`}
            title={
              cell.avgWellness
                ? `Wellness: ${cell.avgWellness}`
                : cell.isCurrentWeek
                  ? 'Pending'
                  : 'Missed'
            }
          />
        ))}
      </div>
      <div className="flex gap-2.5 mt-1.5">
        {[
          { dot: 'bg-primary/40', label: 'Submitted' },
          { dot: 'bg-foreground/[0.08]', label: 'Missed' },
          { dot: 'bg-amber-400/35 border border-dashed border-amber-400/55', label: 'Pending' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-[7px] h-[7px] rounded-sm ${dot}`} />
            <span className="text-[9px] text-foreground/28">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
