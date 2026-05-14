import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainerKpiStrip } from './_components/trainer-kpi-strip';
import { TrainerTodaySessions } from './_components/trainer-today-sessions';
import { TrainerNeedsAttention } from './_components/trainer-needs-attention';
import { TrainerCompliance } from './_components/trainer-compliance';
import { TrainerRecentPrs } from './_components/trainer-recent-prs';
import { TrainerMyTrainingCard } from './_components/trainer-my-training-card';

export default async function TrainerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your members at a glance" />
      <div className="px-4 sm:px-8 py-6 space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerTodaySessions />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <TrainerNeedsAttention />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerCompliance />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerRecentPrs />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
            <TrainerMyTrainingCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
