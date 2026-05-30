import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from '@/components/owner/dashboard-stats';
import { EquipmentStatusSection } from '@/components/owner/equipment-status-section';
import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';

export function OwnerDashboardPage() {
  const fetchStats = useOwnerDashboardStore((s) => s.fetchStats);
  const fetchEquipmentStatus = useOwnerDashboardStore((s) => s.fetchEquipmentStatus);

  useEffect(() => {
    void fetchStats();
    void fetchEquipmentStatus();
  }, [fetchStats, fetchEquipmentStatus]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Gym overview" />
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <DashboardStats />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EquipmentStatusSection />
        </div>
      </div>
    </div>
  );
}
