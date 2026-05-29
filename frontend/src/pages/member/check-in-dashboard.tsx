import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { variants } from '@/lib/animations/variants';
import { type CheckIn } from '@/api/check-ins';

const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOR: Record<string, string> = {
  yes: 'bg-emerald-500/10 text-emerald-300',
  no: 'bg-red-500/10 text-red-300',
  partial: 'bg-amber-500/10 text-amber-300',
};

function SkeletonRow() {
  return <div className="h-[62px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />;
}

function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const dateRaw = checkIn.weekStart || checkIn.submittedAt || '';
  const date = dateRaw.slice(0, 10);
  const wellness = Math.round((checkIn.sleepQuality + checkIn.energy + checkIn.recovery) / 3);

  return (
    <Link
      to={`/member/check-in/${checkIn._id}`}
      className="block rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-foreground">Week of {date}</span>
          <span className="ml-2 text-xs text-foreground/65">Wellness: {wellness}/10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_COLOR[checkIn.stuckToDiet]}`}>
            {DIET_LABEL[checkIn.stuckToDiet]}
          </span>
          {checkIn.weight !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/65">
              {checkIn.weight} kg
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 text-xs text-foreground/65">
        Sleep {checkIn.sleepQuality}/10 · Energy {checkIn.energy}/10 · Recovery {checkIn.recovery}/10
      </div>
    </Link>
  );
}

export function MemberCheckInDashboardPage() {
  const shouldReduceMotion = useReducedMotion();
  const { checkIns, isLoading, fetchCheckIns } = useCheckInsStore();

  useEffect(() => {
    if (checkIns.length === 0) void fetchCheckIns();
  }, [checkIns.length, fetchCheckIns]);

  const submitAction = (
    <Link to="/member/check-in/new">
      <Button size="sm">Submit Check-In</Button>
    </Link>
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title="Check-In Dashboard"
        subtitle="Weekly progress tracking"
        actions={submitAction}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!isLoading && checkIns.length === 0 && (
          <EmptyState
            heading="No check-ins yet"
            description="Submit your first weekly check-in to start tracking your progress."
            action={
              <Link to="/member/check-in/new">
                <Button size="sm">Submit Check-In</Button>
              </Link>
            }
          />
        )}

        {!isLoading && checkIns.length > 0 && (
          <m.div
            className="space-y-1.5"
            variants={shouldReduceMotion ? undefined : variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {checkIns.slice(0, 8).map((ci) => (
              <m.div
                key={ci._id}
                variants={shouldReduceMotion ? undefined : variants.staggerItem}
              >
                <CheckInCard checkIn={ci} />
              </m.div>
            ))}
            {checkIns.length > 8 && (
              <Link
                to="/member/check-in/history"
                className="block text-center text-xs text-foreground/65 hover:text-foreground py-2 transition-colors"
              >
                View all {checkIns.length} check-ins →
              </Link>
            )}
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}
