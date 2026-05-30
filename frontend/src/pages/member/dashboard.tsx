import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemberDashboardStore } from '@/stores/memberDashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { variants } from '@/lib/animations/variants';
import { cn } from '@/lib/utils';

// ─── KPI Cell ─────────────────────────────────────────────────────────────────

interface KpiCellProps {
  value: string;
  label: string;
  delta?: string;
  valueClass?: string;
  deltaClass?: string;
}

function KpiCell({ value, label, delta, valueClass, deltaClass }: KpiCellProps) {
  return (
    <div className="bg-white/[.02] px-2 py-3 text-center border-r border-foreground/[.05] last:border-0">
      <div className={`text-[18px] font-extrabold leading-tight ${valueClass ?? 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[.06em] text-foreground/65 mt-0.5">{label}</div>
      {delta && (
        <div className={`text-[9px] mt-0.5 ${deltaClass ?? 'text-foreground/65'}`}>{delta}</div>
      )}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function MemberHero() {
  const dashboard = useMemberDashboardStore((s) => s.dashboard);
  const user = useAuthStore((s) => s.user);
  const shouldReduceMotion = useReducedMotion();

  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = `${salutation}, ${user?.name?.split(' ')[0] ?? 'there'}`;
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const streak = dashboard?.kpis.activeStreak ?? 0;
  const activePlan = dashboard?.activePlan ?? null;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[.18] via-primary/[.07] to-transparent pointer-events-none" />
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-primary/[.12] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 size-36 rounded-full bg-amber-500/[.06] blur-2xl pointer-events-none" />

      <div className="relative px-4 sm:px-8 py-6 border-b border-primary/[.12]">
        <div className="flex items-start justify-between mb-5">
          <m.div
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
            variants={variants.fadeSlideUp}
          >
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{greeting}</h2>
            <p className="text-[11px] text-foreground/65 mt-0.5">{dateLabel}</p>
          </m.div>

          {streak > 0 && (
            <div className="flex-shrink-0 ml-4 flex flex-col items-center bg-amber-500/[.1] ring-1 ring-amber-500/[.2] rounded-2xl px-4 py-2.5 min-w-[72px]">
              <div className="text-[38px] font-black leading-none bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
                {streak}
              </div>
              <div className="text-[9px] text-foreground/65 uppercase tracking-[.07em] mt-0.5">
                day streak
              </div>
            </div>
          )}
        </div>

        {activePlan ? (
          <div className="bg-primary/[.13] ring-1 ring-primary/[.28] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[.08em] text-primary-light mb-1">
                Active Plan
              </div>
              <div className="text-[16px] font-bold text-foreground truncate">{activePlan.name}</div>
              <div className="text-[11px] text-foreground/65 mt-1">
                {activePlan.dayCount} day{activePlan.dayCount !== 1 ? 's' : ''}
              </div>
            </div>
            <Link
              to="/member/my-training"
              className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[13px] font-bold rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity shadow-lg shadow-primary/[.25]"
            >
              Start
            </Link>
          </div>
        ) : (
          <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-2xl p-4 text-center">
            <p className="text-[12px] text-foreground/65">
              Your trainer hasn&apos;t assigned a plan yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function MemberKpiStrip() {
  const dashboard = useMemberDashboardStore((s) => s.dashboard);
  const isLoading = useMemberDashboardStore((s) => s.isLoading);

  if (isLoading || !dashboard) {
    return (
      <div className="grid grid-cols-4 gap-px mx-4 sm:mx-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    );
  }

  const { kpis } = dashboard;

  return (
    <div className="grid grid-cols-4 ring-1 ring-foreground/[.06] rounded-xl overflow-hidden mx-4 sm:mx-8 mb-4">
      <KpiCell
        value={String(kpis.sessionsThisMonth)}
        label="Sessions"
        delta="this month"
        valueClass="text-primary-light"
      />
      <KpiCell
        value={kpis.weightKg}
        label="Weight kg"
        delta={
          kpis.weightDelta !== null
            ? `${kpis.weightDelta < 0 ? '↓' : '↑'} ${Math.abs(kpis.weightDelta).toFixed(1)} vs last`
            : undefined
        }
        deltaClass={kpis.weightImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpis.bfPct}
        label="Body Fat %"
        delta={
          kpis.bfDelta !== null
            ? `${kpis.bfDelta < 0 ? '↓' : '↑'} ${Math.abs(kpis.bfDelta).toFixed(1)}%`
            : undefined
        }
        valueClass={kpis.bfImproved ? 'text-emerald-400' : undefined}
        deltaClass={kpis.bfImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpis.topPrKg}
        label={kpis.topPrName}
        delta={kpis.isNewPr ? '↑ New PR' : undefined}
        valueClass="text-amber-400"
        deltaClass={kpis.isNewPr ? 'text-amber-400' : undefined}
      />
    </div>
  );
}

// ─── Upcoming Sessions ────────────────────────────────────────────────────────

function UpcomingSessions() {
  const dashboard = useMemberDashboardStore((s) => s.dashboard);
  const sessions = dashboard?.upcomingSessions ?? [];

  if (sessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 flex flex-col min-h-[160px]">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          Upcoming Sessions
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-foreground/40">No sessions scheduled</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 min-h-[160px]">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Upcoming Sessions
      </div>
      <div className="space-y-0">
        {sessions.map((s) => {
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((sessionDate.getTime() - today.getTime()) / 86400000);
          const isToday = diffDays === 0;
          const badge = isToday ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days`;
          const badgeClass = isToday
            ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
            : diffDays <= 2
              ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
              : 'bg-white/[.05] text-foreground/65 ring-1 ring-white/[.08]';

          const dayLabel = sessionDate.toLocaleDateString('en-GB', { weekday: 'short' });
          const timeLabel = `${dayLabel} ${s.startTime}`;

          return (
            <div
              key={s._id}
              className="flex items-center gap-3 py-2.5 border-b border-white/[.04] last:border-0"
            >
              <div className="text-[10px] font-bold text-primary-light min-w-[60px]">{timeLabel}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {s.memberCount > 1 ? `Group (${s.memberCount})` : 'Training session'}
                </div>
              </div>
              <span className={cn('text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0', badgeClass)}>
                {badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Nutrition Today ──────────────────────────────────────────────────────────

function NutritionToday() {
  const dashboard = useMemberDashboardStore((s) => s.dashboard);
  const nutritionToday = dashboard?.nutritionToday ?? null;

  if (!nutritionToday) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4 flex flex-col min-h-[160px]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
          Nutrition Today
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-foreground/40">No nutrition plan assigned</p>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'Protein', value: Math.round(nutritionToday.protein), unit: 'g', colorClass: 'text-emerald-400' },
    { label: 'Carbs', value: Math.round(nutritionToday.carbs), unit: 'g', colorClass: 'text-amber-400' },
    { label: 'Fat', value: Math.round(nutritionToday.fat), unit: 'g', colorClass: 'text-pink-400' },
    { label: 'Calories', value: Math.round(nutritionToday.kcal), unit: 'kcal', colorClass: 'text-foreground/65' },
  ];

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65">
          Nutrition Today
        </div>
        <span className="text-[9px] bg-primary/[.12] text-primary-light ring-1 ring-primary/[.2] rounded-full px-2 py-0.5 font-semibold">
          {nutritionToday.dayTypeName}
        </span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, unit, colorClass }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] text-foreground/65 uppercase tracking-[.05em]">{label}</span>
            <span className={`text-[14px] font-bold ${colorClass}`}>
              {value} <span className="text-[10px] text-foreground/65 font-normal">{unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MemberDashboardPage() {
  const fetch = useMemberDashboardStore((s) => s.fetch);
  const isLoading = useMemberDashboardStore((s) => s.isLoading);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-52 rounded-none" />
      ) : (
        <MemberHero />
      )}

      <div className="py-4 space-y-4">
        <MemberKpiStrip />

        <div className="px-4 sm:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
            Today &amp; Upcoming
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NutritionToday />
            <UpcomingSessions />
          </div>
        </div>
      </div>
    </div>
  );
}
