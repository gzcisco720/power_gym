import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';

interface Props {
  checkIns: CheckInRecord[];
  totalCount: number;
}

const WELLNESS_DOT = (value: number) =>
  value >= 7 ? 'bg-emerald-400' : value >= 5 ? 'bg-amber-400' : 'bg-red-400';

const DIET_PILL: Record<string, string> = {
  yes: 'bg-emerald-400/10 text-emerald-400',
  no: 'bg-red-400/10 text-red-400',
  partial: 'bg-amber-400/10 text-amber-400',
};
const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };

function wellnessDots(c: CheckInRecord) {
  return [c.sleepQuality, c.energy, c.recovery, c.stress, c.fatigue, c.hunger, c.digestion];
}

export function HistoryList({ checkIns, totalCount }: Props) {
  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">History</span>
        <Link href="/member/check-in/history" className="text-[11px] text-primary-light">
          View all {totalCount} →
        </Link>
      </div>

      {checkIns.map((c, idx) => (
        <Link
          key={c._id}
          href={`/member/check-in/${c._id}`}
          className={`flex items-center gap-2.5 px-[18px] py-2.5 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors ${idx === checkIns.length - 1 ? 'opacity-60 border-b-0' : ''}`}
        >
          {/* Date */}
          <div className="min-w-[68px]">
            <div className="text-xs font-medium">{format(new Date(c.submittedAt), 'd MMM')}</div>
            <div className="text-[10px] text-foreground/30">
              {formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}
            </div>
          </div>

          {/* Wellness dots */}
          <div className="flex items-center gap-[3px]">
            {wellnessDots(c).map((v, i) => (
              <div key={i} className={`w-[5px] h-[5px] rounded-full ${WELLNESS_DOT(v)}`} />
            ))}
            <span className="text-[11px] text-foreground/38 ml-1">{avgWellnessScore(c)}</span>
          </div>

          {/* Pills */}
          <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_PILL[c.stuckToDiet]}`}>
              {DIET_LABEL[c.stuckToDiet]}
            </span>
            {c.weight !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                {c.weight} kg
              </span>
            )}
            {c.photos.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                {c.photos.length} 📷
              </span>
            )}
          </div>

          <span className="text-foreground/18 text-sm flex-shrink-0">›</span>
        </Link>
      ))}
    </div>
  );
}
