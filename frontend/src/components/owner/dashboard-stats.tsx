import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';

export function DashboardStats() {
  const stats = useOwnerDashboardStore((s) => s.stats);
  const isLoading = useOwnerDashboardStore((s) => s.isLoading);

  if (isLoading || !stats) {
    return <StatCardsSkeleton count={6} className="sm:grid-cols-3" />;
  }

  const sessionGrowth =
    stats.sessionsLastMonth > 0
      ? Math.round(
          ((stats.sessionsThisMonth - stats.sessionsLastMonth) / stats.sessionsLastMonth) * 100,
        )
      : 0;

  const checkInsLastWeekAdjusted = stats.checkInsLastWeek - stats.checkInsThisWeek;
  const checkInRate =
    checkInsLastWeekAdjusted > 0
      ? Math.round((stats.checkInsThisWeek / checkInsLastWeekAdjusted) * 100) - 100
      : 0;

  const checkInDelta =
    checkInRate >= 0
      ? `↑ ${checkInRate}% vs last week`
      : `↓ ${Math.abs(checkInRate)}% vs last week`;

  const checkInPct = Math.min(
    Math.round((stats.checkInsThisWeek / Math.max(stats.memberCount, 1)) * 100),
    100,
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Trainers" value={String(stats.trainerCount)} accentColor="primary" />
      <StatCard
        label="Members"
        value={String(stats.memberCount)}
        delta={`↑ ${stats.membersThisMonth} joined this month`}
      />
      <StatCard
        label="Sessions / Month"
        value={String(stats.sessionsThisMonth)}
        accentColor="success"
        delta={
          sessionGrowth >= 0
            ? `↑ ${sessionGrowth}% vs last month`
            : `↓ ${Math.abs(sessionGrowth)}% vs last month`
        }
      />
      <StatCard
        label="Active Today"
        value={String(stats.sessionsToday)}
        delta="sessions started today"
      />
      <StatCard
        label="Check-in Rate"
        value={`${checkInPct}%`}
        accentColor="achievement"
        delta={checkInDelta}
      />
      <StatCard
        label="Pending Invites"
        value={String(stats.pendingInviteCount)}
        delta={
          stats.expiringSoonCount > 0 ? `${stats.expiringSoonCount} expiring soon` : 'all valid'
        }
      />
    </div>
  );
}
