import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';

function formatRelativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatDelta(value: number, unit: string): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  if (value === 0) return { text: `= 0.0 ${unit}`, variant: 'neutral' };
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return {
    text: `${down ? '▼' : '▲'} ${abs} ${unit}`,
    variant: down ? 'success' : 'neutral',
  };
}

function formatBfDelta(value: number): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  if (value === 0) return { text: '= 0.0%', variant: 'neutral' };
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return {
    text: `${down ? '▼' : '▲'} ${abs}%`,
    variant: down ? 'success' : 'warning',
  };
}

export async function StatStripSection({ memberId }: { memberId: string }) {
  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const [tests, stats, recentSessions] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    sessionRepo.findMemberStats(memberId),
    sessionRepo.findRecentCompletedByMemberIds([memberId], 1),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;
  const lastDayName = recentSessions[0]?.dayName ?? null;

  const weightDelta = latest && previous
    ? formatDelta(latest.weight - previous.weight, 'kg')
    : null;

  const bfDelta = latest && previous
    ? formatBfDelta(latest.bodyFatPct - previous.bodyFatPct)
    : null;

  const lastSessionLabel = stats.lastCompletedAt
    ? formatRelativeDate(stats.lastCompletedAt)
    : '—';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Weight"
        value={latest ? String(latest.weight) : '—'}
        unit={latest ? 'kg' : undefined}
        delta={weightDelta?.text ?? (latest && !previous ? 'No prior test' : undefined)}
        deltaVariant={weightDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Body Fat"
        value={latest ? latest.bodyFatPct.toFixed(1) : '—'}
        unit={latest ? '%' : undefined}
        delta={bfDelta?.text ?? (latest && !previous ? 'No prior test' : undefined)}
        deltaVariant={bfDelta?.variant ?? 'neutral'}
      />
      <StatCard
        label="Sessions"
        value={String(stats.completedCount)}
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
