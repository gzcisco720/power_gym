import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { StatCard } from '@/components/shared/stat-card';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

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
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="当前体重"
          value={latestTest ? String(latestTest.weight) : '—'}
          unit={latestTest ? 'kg' : undefined}
        />
        <StatCard
          label="体脂率"
          value={latestTest ? String(latestTest.bodyFatPct) : '—'}
          unit={latestTest ? '%' : undefined}
        />
        <StatCard
          label="累计训练"
          value={String(stats.completedCount)}
          unit="次"
        />
        <StatCard label="上次训练" value={lastTrainedLabel} />
        <StatCard
          label="当前计划"
          value={activePlan ? activePlan.name : '无计划'}
        />
      </div>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}
