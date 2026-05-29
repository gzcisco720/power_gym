import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { PageHeader } from '@/components/shared/page-header';
import { variants } from '@/lib/animations/variants';
import { type CheckIn } from '@/api/check-ins';

const RATINGS: Array<{ label: string; key: keyof CheckIn }> = [
  { label: 'Sleep Quality', key: 'sleepQuality' },
  { label: 'Energy', key: 'energy' },
  { label: 'Recovery', key: 'recovery' },
  { label: 'Digestion', key: 'digestion' },
  { label: 'Hunger', key: 'hunger' },
  { label: 'Stress', key: 'stress' },
  { label: 'Fatigue', key: 'fatigue' },
];

function avgWellness(c: CheckIn): number {
  const total = c.sleepQuality + c.energy + c.recovery + c.digestion + c.hunger + c.stress + c.fatigue;
  return Math.round((total / 7) * 10) / 10;
}

export function MemberCheckInDetailPage() {
  const shouldReduceMotion = useReducedMotion();
  const { id } = useParams<{ id: string }>();
  const { checkIns, isLoading, fetchCheckIns } = useCheckInsStore();

  useEffect(() => {
    if (checkIns.length === 0) void fetchCheckIns();
  }, [checkIns.length, fetchCheckIns]);

  const checkIn = id ? checkIns.find((c) => c._id === id) : undefined;

  if (isLoading && !checkIn) {
    return (
      <LazyMotion features={domAnimation}>
        <PageHeader title="Check-In" />
        <div className="px-4 sm:px-8 py-6">
          <div className="h-[200px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
        </div>
      </LazyMotion>
    );
  }

  if (!checkIn) {
    return (
      <LazyMotion features={domAnimation}>
        <PageHeader title="Check-In" />
        <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
          <Link to="/member/check-in/history" className="text-sm text-foreground/65 hover:text-foreground inline-block mb-4">
            ← History
          </Link>
          <p className="text-sm text-foreground/65">Check-in not found.</p>
        </div>
      </LazyMotion>
    );
  }

  const wellnessScore = avgWellness(checkIn);
  const weekDate = checkIn.weekStart.slice(0, 10);

  const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title={`Week of ${weekDate}`}
        subtitle={`Wellness score: ${wellnessScore}/10`}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto space-y-4">
        <Link to="/member/check-in/history" className="text-sm text-foreground/65 hover:text-foreground inline-block transition-colors">
          ← History
        </Link>

        {/* Wellness ratings */}
        <m.div
          className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden"
          variants={shouldReduceMotion ? undefined : variants.fadeSlideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            How I felt
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {RATINGS.map(({ label, key }) => {
              const value = checkIn[key] as number;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-foreground/65 w-28">{label}</span>
                  <div className="flex-1 h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-primary-light w-5 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </m.div>

        {/* Body & activity */}
        {(checkIn.weight !== null || checkIn.waist !== null) && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Body & Activity
            </div>
            <div className="grid grid-cols-2 gap-px bg-foreground/5">
              {checkIn.weight !== null && (
                <div className="bg-card px-3 py-2.5">
                  <div className="text-[10px] text-foreground/35 uppercase tracking-wider">Weight</div>
                  <div className="text-base font-bold mt-0.5">
                    {checkIn.weight}<span className="text-xs text-foreground/35 font-normal ml-0.5">kg</span>
                  </div>
                </div>
              )}
              {checkIn.waist !== null && (
                <div className="bg-card px-3 py-2.5">
                  <div className="text-[10px] text-foreground/35 uppercase tracking-wider">Waist</div>
                  <div className="text-base font-bold mt-0.5">
                    {checkIn.waist}<span className="text-xs text-foreground/35 font-normal ml-0.5">cm</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diet */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">Diet</div>
          <div className="text-sm font-medium">{DIET_LABEL[checkIn.stuckToDiet]}</div>
          {checkIn.dietDetails && <p className="text-xs text-foreground/65">{checkIn.dietDetails}</p>}
        </div>

        {/* Wellbeing / Notes */}
        {(checkIn.wellbeing || checkIn.notes) && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 space-y-2">
            {checkIn.wellbeing && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-0.5">Wellbeing</div>
                <p className="text-xs text-foreground/65">{checkIn.wellbeing}</p>
              </div>
            )}
            {checkIn.notes && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-0.5">Notes</div>
                <p className="text-xs text-foreground/65">{checkIn.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </LazyMotion>
  );
}
