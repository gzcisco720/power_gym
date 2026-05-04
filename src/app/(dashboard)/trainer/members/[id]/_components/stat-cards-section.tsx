import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function StatCardsSection({ memberId }: { memberId: string }) {
  await connectDB();
  const [latestTest, stats, activePlan] = await Promise.all([
    new MongoBodyTestRepository().findLatestByMember(memberId),
    new MongoWorkoutSessionRepository().findMemberStats(memberId),
    new MongoMemberPlanRepository().findActive(memberId),
  ]);

  const lastTrainedLabel = stats.lastCompletedAt
    ? formatRelativeDate(stats.lastCompletedAt)
    : '—';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Weight"
        value={latestTest ? String(latestTest.weight) : '—'}
        unit={latestTest ? 'kg' : undefined}
      />
      <StatCard
        label="Body Fat"
        value={latestTest ? String(latestTest.bodyFatPct) : '—'}
        unit={latestTest ? '%' : undefined}
      />
      <StatCard label="Sessions" value={String(stats.completedCount)} />
      <StatCard label="Last Session" value={lastTrainedLabel} />
      <StatCard label="Active Plan" value={activePlan ? activePlan.name : 'None'} />
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
