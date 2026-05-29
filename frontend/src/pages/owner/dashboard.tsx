import { useEffect } from 'react';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';

export function OwnerDashboardPage() {
  const { ownerStats, fetchOwnerStats, isLoading } = useUsersStore();

  useEffect(() => {
    void fetchOwnerStats();
  }, [fetchOwnerStats]);

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="p-4 sm:p-8">
        {isLoading ? (
          <StatCardsSkeleton count={4} className="sm:grid-cols-4" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Members"
              value={String(ownerStats?.memberCount ?? 0)}
              accentColor="primary"
            />
            <StatCard
              label="Total Trainers"
              value={String(ownerStats?.trainerCount ?? 0)}
              accentColor="primary"
            />
            <StatCard
              label="Pending Invites"
              value={String(ownerStats?.pendingInviteCount ?? 0)}
            />
            <StatCard
              label="New This Month"
              value={String(ownerStats?.membersByMonth?.[0]?.newCount ?? 0)}
              accentColor="success"
            />
          </div>
        )}
      </div>
    </div>
  );
}
