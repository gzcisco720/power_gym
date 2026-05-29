import { useEffect } from 'react';
import { useUsersStore } from '@/stores/usersStore';

export function OwnerDashboardPage() {
  const { ownerStats, fetchOwnerStats, isLoading } = useUsersStore();

  useEffect(() => {
    void fetchOwnerStats();
  }, [fetchOwnerStats]);

  if (isLoading) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Members" value={ownerStats?.memberCount ?? 0} />
        <StatCard label="Total Trainers" value={ownerStats?.trainerCount ?? 0} />
        <StatCard label="Pending Invites" value={ownerStats?.pendingInviteCount ?? 0} />
        <StatCard label="New This Month" value={ownerStats?.membersByMonth?.[0]?.newCount ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
