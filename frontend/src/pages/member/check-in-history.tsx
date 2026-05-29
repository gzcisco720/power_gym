import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { variants } from '@/lib/animations/variants';
import { type CheckIn } from '@/api/check-ins';

const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOR: Record<string, string> = {
  yes: 'bg-emerald-500/10 text-emerald-300',
  no: 'bg-red-500/10 text-red-300',
  partial: 'bg-amber-500/10 text-amber-300',
};

function SkeletonRow() {
  return <div className="h-[60px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />;
}

function HistoryCard({ checkIn }: { checkIn: CheckIn }) {
  const dateRaw = checkIn.weekStart || checkIn.submittedAt || '';
  const date = dateRaw.slice(0, 10);
  const wellness = Math.round((checkIn.sleepQuality + checkIn.energy + checkIn.recovery) / 3);

  return (
    <Link
      to={`/member/check-in/${checkIn._id}`}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors last:border-b-0"
    >
      <div className="min-w-[90px]">
        <div className="text-sm font-medium text-foreground">Week of {date}</div>
        <div className="text-[10px] text-foreground/40">
          {checkIn.submittedAt.slice(0, 10)}
        </div>
      </div>
      <div className="text-xs text-foreground/65">{wellness}/10</div>
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_COLOR[checkIn.stuckToDiet]}`}>
          {DIET_LABEL[checkIn.stuckToDiet]}
        </span>
        {checkIn.weight !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/65">
            {checkIn.weight} kg
          </span>
        )}
      </div>
      <span className="text-foreground/40 text-sm shrink-0">›</span>
    </Link>
  );
}

export function MemberCheckInHistoryPage() {
  const shouldReduceMotion = useReducedMotion();
  const { checkIns, isLoading, fetchCheckIns } = useCheckInsStore();

  useEffect(() => {
    void fetchCheckIns();
  }, [fetchCheckIns]);

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title="Check-In History"
        subtitle={checkIns.length > 0 ? `${checkIns.length} total check-ins` : undefined}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        <Link
          to="/member/check-in"
          className="text-sm text-foreground/65 hover:text-foreground mb-4 inline-block transition-colors"
        >
          ← Back to dashboard
        </Link>

        {isLoading && (
          <div className="space-y-1.5 mt-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!isLoading && checkIns.length === 0 && (
          <EmptyState
            heading="No check-ins yet"
            description="Submit your first weekly check-in to start tracking your history."
          />
        )}

        {!isLoading && checkIns.length > 0 && (
          <m.div
            className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden mt-4"
            variants={shouldReduceMotion ? undefined : variants.fadeSlideUp}
            initial="hidden"
            animate="visible"
          >
            {checkIns.map((ci) => (
              <HistoryCard key={ci._id} checkIn={ci} />
            ))}
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}
