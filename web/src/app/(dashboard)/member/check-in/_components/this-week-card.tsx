import Link from 'next/link';
import type { HeatmapCell } from '@/lib/check-in-stats';
import { ConsistencyHeatmap } from './consistency-heatmap';

interface Props {
  hasThisWeek: boolean;
  heatmap: HeatmapCell[];
  submittedDate?: string;
  avgWellness?: number | null;
  weight?: number | null;
}

export function ThisWeekCard({ hasThisWeek, heatmap, submittedDate, avgWellness, weight }: Props) {
  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] p-[18px]">
      {hasThisWeek ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
            <span className="text-xs text-foreground/45">
              Submitted this week{submittedDate ? ` · ${submittedDate}` : ''}
            </span>
          </div>
          <div className="flex gap-3">
            {avgWellness !== null && avgWellness !== undefined && (
              <div className="bg-foreground/5 rounded-lg px-3 py-2 text-center flex-1">
                <div className="text-base font-bold text-primary-light">{avgWellness}</div>
                <div className="text-[10px] text-foreground/35">Wellness</div>
              </div>
            )}
            {weight !== null && weight !== undefined && (
              <div className="bg-foreground/5 rounded-lg px-3 py-2 text-center flex-1">
                <div className="text-base font-bold">{weight}</div>
                <div className="text-[10px] text-foreground/35">kg</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
            <span className="text-xs text-foreground/45">This week not submitted yet</span>
          </div>
          <Link
            href="/member/check-in/new"
            className="block w-full text-center bg-gradient-to-br from-primary to-indigo-400 text-white rounded-[10px] py-3 text-sm font-semibold"
          >
            Submit This Week&apos;s Check-In →
          </Link>
        </>
      )}
      <ConsistencyHeatmap cells={heatmap} />
    </div>
  );
}
