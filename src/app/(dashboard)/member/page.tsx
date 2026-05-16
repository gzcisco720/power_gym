import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberHero } from './_components/member-hero';
import { MemberKpiStrip } from './_components/member-kpi-strip';
import { MemberBodyChart } from './_components/member-body-chart';
import { MemberStrengthChart } from './_components/member-strength-chart';
import { MemberNutritionToday } from './_components/member-nutrition-today';
import { MemberUpcomingSessions } from './_components/member-upcoming-sessions';

export default async function MemberDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <Suspense fallback={<Skeleton className="h-52 rounded-none" />}>
        <MemberHero />
      </Suspense>

      <div className="py-4 space-y-4">
        <Suspense
          fallback={
            <div className="grid grid-cols-4 gap-px mx-4 sm:mx-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px]" />
              ))}
            </div>
          }
        >
          <MemberKpiStrip />
        </Suspense>

        <div className="px-4 sm:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
            Progress
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Suspense fallback={<Skeleton className="h-[164px] rounded-xl" />}>
              <MemberBodyChart />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[164px] rounded-xl" />}>
              <MemberStrengthChart />
            </Suspense>
          </div>
        </div>

        <div className="px-4 sm:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
            Today &amp; Upcoming
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Suspense fallback={<Skeleton className="h-[160px] rounded-xl" />}>
              <MemberNutritionToday />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[160px] rounded-xl" />}>
              <MemberUpcomingSessions />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
