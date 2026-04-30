import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { StatCard } from '@/components/shared/stat-card';
import { Card } from '@/components/ui/card';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();

  const [latestTest, stats, activePlan, activeInjuries] = await Promise.all([
    new MongoBodyTestRepository().findLatestByMember(memberId),
    new MongoWorkoutSessionRepository().findMemberStats(memberId),
    new MongoMemberPlanRepository().findActive(memberId),
    new MongoMemberInjuryRepository().findActiveByMember(memberId),
  ]);

  const lastTrainedLabel = stats.lastCompletedAt
    ? formatRelativeDate(stats.lastCompletedAt)
    : '—';

  return (
    <div className="px-4 sm:px-8 py-7 space-y-6">
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

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
          Health
        </h2>
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {activeInjuries.length === 0 ? (
            <p className="px-5 py-5 text-[13px] text-[#555]">No active injuries</p>
          ) : (
            activeInjuries.map((injury) => (
              <div
                key={(injury._id as { toString(): string }).toString()}
                className="px-5 py-3.5 border-b border-[#0f0f0f] last:border-0"
              >
                <p className="text-[13px] font-medium text-white">{injury.title}</p>
                {injury.affectedMovements && (
                  <p className="text-[11px] text-[#666] mt-0.5">{injury.affectedMovements}</p>
                )}
              </div>
            ))
          )}
        </Card>
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
