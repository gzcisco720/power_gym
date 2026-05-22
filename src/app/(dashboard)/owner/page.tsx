import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from './_components/dashboard-stats';
import { DashboardStatsSkeleton } from './_components/dashboard-stats-skeleton';
import { MemberGrowthChart } from './_components/member-growth-chart';
import { TrainerPerformanceSection } from './_components/trainer-performance-section';
import { EquipmentStatusSection } from './_components/equipment-status-section';
import { Skeleton } from '@/components/ui/skeleton';

export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Gym overview" />
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>

        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
            Member Growth — Last 6 Months
          </div>
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <MemberGrowthChart />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerPerformanceSection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <EquipmentStatusSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
