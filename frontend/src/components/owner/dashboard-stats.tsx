import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';

export function DashboardStats() {
  const stats = useOwnerDashboardStore((s) => s.stats);
  const isLoading = useOwnerDashboardStore((s) => s.isLoading);

  if (isLoading || !stats) {
    return <StatCardsSkeleton count={4} className="sm:grid-cols-2" />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Trainers" value={String(stats.trainerCount)} accentColor="primary" />
      <StatCard label="Members" value={String(stats.memberCount)} />
      <StatCard
        label="Sessions / Month"
        value={String(stats.sessionsThisMonth)}
        accentColor="success"
      />
      <StatCard label="Pending Invites" value={String(stats.pendingInviteCount)} />
    </div>
  );
}
