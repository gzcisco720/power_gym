import { StatCard } from '@/components/shared/stat-card';
import type { StatStrip } from '@/api/member-hub';

interface StatStripSectionProps {
  statStrip: StatStrip;
}

export function StatStripSection({ statStrip }: StatStripSectionProps) {
  const { weight, bodyFatPct, sessionsLast90, lastSessionLabel, lastDayName, weightDelta, bfDelta } = statStrip;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Weight"
        value={weight !== null ? String(weight) : '—'}
        unit={weight !== null ? 'kg' : undefined}
        delta={weightDelta?.text ?? (weight !== null && !weightDelta ? 'No prior test' : undefined)}
        deltaVariant={weightDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Body Fat"
        value={bodyFatPct !== null ? bodyFatPct.toFixed(1) : '—'}
        unit={bodyFatPct !== null ? '%' : undefined}
        delta={bfDelta?.text ?? (bodyFatPct !== null && !bfDelta ? 'No prior test' : undefined)}
        deltaVariant={bfDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Sessions"
        value={String(sessionsLast90)}
        delta="last 90 days"
      />
      <StatCard
        label="Last Session"
        value={lastSessionLabel}
        delta={lastDayName ?? undefined}
      />
    </div>
  );
}
