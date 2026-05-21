import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { StatStripSection } from './_components/stat-strip-section';
import { PlanCardSection } from './_components/plan-card-section';
import { HealthPanelSection } from './_components/health-panel-section';
import { BodyCompositionSection } from './_components/body-composition-section';
import { TrainingFrequencySection } from './_components/training-frequency-section';

export default async function MemberHubOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[80px] rounded-xl" />
                ))}
              </div>
            }
          >
            <StatStripSection memberId={memberId} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[88px] rounded-xl" />}>
            <PlanCardSection memberId={memberId} />
          </Suspense>
        </div>

        {/* Right column */}
        <Suspense fallback={<Skeleton className="h-[200px] rounded-xl" />}>
          <HealthPanelSection memberId={memberId} />
        </Suspense>
      </div>

      {/* Progress row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <Suspense fallback={<Skeleton className="h-[200px] rounded-xl" />}>
          <BodyCompositionSection memberId={memberId} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[200px] rounded-xl" />}>
          <TrainingFrequencySection memberId={memberId} />
        </Suspense>
      </div>
    </div>
  );
}
