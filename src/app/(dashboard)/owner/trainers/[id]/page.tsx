import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
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
      <Suspense fallback={<StatCardsSkeleton count={3} className="grid-cols-3" />}>
        <TrainerStatsSection trainerId={trainerId} />
      </Suspense>
    </div>
  );
}
