import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainerStatsSection } from './_components/trainer-stats-section';

export default async function TrainerHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7">
      <Suspense
        fallback={
          <div className="space-y-4">
            <StatCardsSkeleton count={6} className="grid-cols-3" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        }
      >
        <TrainerStatsSection trainerId={trainerId} />
      </Suspense>
    </div>
  );
}
