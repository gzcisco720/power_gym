import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from '@/components/owner/dashboard-stats';
import { EquipmentStatusSection } from '@/components/owner/equipment-status-section';
import { MemberGrowthChart } from '@/components/owner/member-growth-chart';
import { TrainerBreakdownTable } from '@/components/owner/trainer-breakdown-table';
import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';

export function OwnerDashboardPage() {
  const fetchStats = useOwnerDashboardStore((s) => s.fetchStats);
  const fetchEquipmentStatus = useOwnerDashboardStore((s) => s.fetchEquipmentStatus);
  const fetchTrainerBreakdown = useOwnerDashboardStore((s) => s.fetchTrainerBreakdown);
  const fetchMemberGrowth = useOwnerDashboardStore((s) => s.fetchMemberGrowth);
  const trainerBreakdown = useOwnerDashboardStore((s) => s.trainerBreakdown);
  const memberGrowth = useOwnerDashboardStore((s) => s.memberGrowth);

  useEffect(() => {
    void fetchStats();
    void fetchEquipmentStatus();
    void fetchTrainerBreakdown();
    void fetchMemberGrowth();
  }, [fetchStats, fetchEquipmentStatus, fetchTrainerBreakdown, fetchMemberGrowth]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Gym overview" />
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <DashboardStats />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EquipmentStatusSection />
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3.5">
            Member Growth
          </div>
          <MemberGrowthChart data={memberGrowth} />
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3.5">
            Trainer Breakdown
          </div>
          <TrainerBreakdownTable trainers={trainerBreakdown} />
        </div>
      </div>
    </div>
  );
}
