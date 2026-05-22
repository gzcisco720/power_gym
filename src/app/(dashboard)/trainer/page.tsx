import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainerKpiStrip } from './_components/trainer-kpi-strip';
import { TrainerTodaySessions } from './_components/trainer-today-sessions';
import { TrainerNeedsAttention } from './_components/trainer-needs-attention';
import { TrainerPendingCheckIns } from './_components/trainer-pending-checkins';
import { TrainerCompliance } from './_components/trainer-compliance';
import { TrainerRecentPrs } from './_components/trainer-recent-prs';
import { TrainerMyTrainingCard } from './_components/trainer-my-training-card';
import { TrainerWeekSchedule } from './_components/trainer-week-schedule';

export default async function TrainerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your members at a glance" />
      <div className="px-4 sm:px-8 py-6 space-y-4">

        {/* Row 1 — KPI Strip */}
        <Suspense
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          }
        >
          <TrainerKpiStrip />
        </Suspense>

        {/* Row 2 — Main content: Today's Sessions (left) + Alerts sidebar (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          <div className="lg:col-span-3">
            <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
              <TrainerTodaySessions />
            </Suspense>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Suspense fallback={<Skeleton className="h-36 rounded-xl" />}>
              <TrainerNeedsAttention />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-36 rounded-xl" />}>
              <TrainerPendingCheckIns />
            </Suspense>
          </div>
        </div>

        {/* Row 3 — Bottom 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerCompliance />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerRecentPrs />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerMyTrainingCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerWeekSchedule />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
