import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { StatCardsSection } from './_components/stat-cards-section';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { HealthSection } from './_components/health-section';
import { HealthSectionSkeleton } from './_components/health-section-skeleton';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7 space-y-6">
      <Suspense fallback={<StatCardsSkeleton count={5} className="sm:grid-cols-3 lg:grid-cols-5" />}>
        <StatCardsSection memberId={memberId} />
      </Suspense>
      <Suspense fallback={<HealthSectionSkeleton />}>
        <HealthSection memberId={memberId} />
      </Suspense>
    </div>
  );
}
