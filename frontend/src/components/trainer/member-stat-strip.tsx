import { StatCard } from '@/components/shared/stat-card';
import { countInWindow, lastSession } from '@/lib/training/session-stats';
import type { BodyTest } from '@/api/body-tests';
import type { WorkoutSession } from '@/api/training';

interface MemberStatStripProps {
  bodyTests: BodyTest[];
  sessions: WorkoutSession[];
  /** Injectable for testing; defaults to current time. */
  referenceNow?: Date;
}

function formatRelativeDate(dateStr: string, referenceNow: Date): string {
  const date = new Date(dateStr);
  const days = Math.floor((referenceNow.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export function MemberStatStrip({
  bodyTests,
  sessions,
  referenceNow = new Date(),
}: MemberStatStripProps) {
  // Most recent body test is the first when sorted descending by date (ES2020: spread before sort)
  const sortedTests = [...bodyTests].sort(
    (a: BodyTest, b: BodyTest) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sortedTests[0] ?? null;

  const sessionCount = countInWindow(sessions, 90, referenceNow);
  const last = lastSession(sessions);

  const lastSessionValue = last?.completedAt
    ? formatRelativeDate(last.completedAt, referenceNow)
    : '—';

  const lastSessionDelta = last?.completedAt
    ? getDayName(last.completedAt)
    : undefined;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Weight"
        value={latest ? String(latest.weight) : '—'}
        unit={latest ? 'kg' : undefined}
      />
      <StatCard
        label="Body Fat"
        value={latest ? String(latest.bodyFatPct) : '—'}
        unit={latest ? '%' : undefined}
      />
      <StatCard
        label="Sessions"
        value={String(sessionCount)}
        delta="last 90 days"
      />
      <StatCard
        label="Last Session"
        value={lastSessionValue}
        delta={lastSessionDelta}
      />
    </div>
  );
}
