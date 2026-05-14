import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberHero } from './_components/member-hero';
import { MemberTodayWorkout } from './_components/member-today-workout';
import { MemberKeyNumbers } from './_components/member-key-numbers';
import { MemberNutritionTargets } from './_components/member-nutrition-targets';
import { MemberUpcomingSessions } from './_components/member-upcoming-sessions';
import { MemberBodyComposition } from './_components/member-body-composition';
import { MemberPersonalBests } from './_components/member-personal-bests';

export default async function MemberDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="px-4 sm:px-8 py-6">
        <Suspense fallback={<Skeleton className="h-14 mb-4 rounded-xl" />}>
          <MemberHero />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-28 mb-4 rounded-xl" />}>
          <MemberTodayWorkout />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid grid-cols-3 gap-3 mb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          }
        >
          <MemberKeyNumbers />
        </Suspense>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
            <MemberNutritionTargets />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
            <MemberUpcomingSessions />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MemberBodyComposition />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MemberPersonalBests />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
