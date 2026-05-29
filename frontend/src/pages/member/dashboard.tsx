import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Dumbbell, Salad, ClipboardCheck, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { variants } from '@/lib/animations/variants';

interface QuickLinkProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function QuickLinkCard({ to, icon, title, description }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-light">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground/65">{description}</p>
      </div>
    </Link>
  );
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${timeGreeting}, ${name}` : timeGreeting;
}

function formatDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function MemberDashboardPage() {
  const { user } = useAuthStore();
  const { memberPlans, fetchMemberPlan } = useTrainingStore();
  const { testsByMember, fetchTests } = useBodyTestsStore();
  const reducedMotion = useReducedMotion();

  const memberId = user?.id ?? '';
  const memberPlan = memberPlans[memberId];
  const tests = testsByMember[memberId] ?? [];
  const latestTest = tests[0] ?? null;

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  useEffect(() => {
    if (memberId && !(memberId in testsByMember)) {
      void fetchTests(memberId);
    }
  }, [memberId, testsByMember, fetchTests]);

  const greeting = getGreeting(user?.name ?? '');
  const dateLabel = formatDateLabel();

  const weightKg = latestTest?.weight ? `${latestTest.weight}` : '—';
  const bodyFatPct = latestTest?.bodyFatPct ? `${latestTest.bodyFatPct.toFixed(1)}%` : '—';

  const planName = memberPlan?.name ?? '—';

  const containerVariant = reducedMotion ? {} : variants.staggerContainer;
  const itemVariant = reducedMotion ? {} : variants.staggerItem;

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Dashboard" subtitle={dateLabel} />

        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto w-full space-y-6">
          {/* Greeting */}
          <m.div variants={variants.fadeSlideUp} initial="hidden" animate="visible">
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
              {greeting}
            </h2>
            <p className="text-[12px] text-foreground/65 mt-0.5">Here's your overview</p>
          </m.div>

          {/* Stat cards */}
          <m.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            variants={containerVariant}
            initial="hidden"
            animate="visible"
          >
            <m.div variants={itemVariant}>
              <StatCard label="Active Plan" value={planName} accentColor="primary" />
            </m.div>
            <m.div variants={itemVariant}>
              <StatCard
                label="Weight"
                value={weightKg}
                unit={latestTest?.weight ? 'kg' : undefined}
                accentColor="success"
              />
            </m.div>
            <m.div variants={itemVariant} className="col-span-2 sm:col-span-1">
              <StatCard label="Body Fat" value={bodyFatPct} accentColor="achievement" />
            </m.div>
          </m.div>

          {/* Quick links */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
              Quick Access
            </div>
            <m.div
              className="space-y-1.5"
              variants={containerVariant}
              initial="hidden"
              animate="visible"
            >
              <m.div variants={itemVariant}>
                <QuickLinkCard
                  to="/member/my-training"
                  icon={<Dumbbell className="size-4" />}
                  title="My Training"
                  description={memberPlan ? memberPlan.name : 'Start or log a workout'}
                />
              </m.div>
              <m.div variants={itemVariant}>
                <QuickLinkCard
                  to="/member/nutrition"
                  icon={<Salad className="size-4" />}
                  title="Nutrition"
                  description="Track your daily food intake"
                />
              </m.div>
              <m.div variants={itemVariant}>
                <QuickLinkCard
                  to="/member/check-in"
                  icon={<ClipboardCheck className="size-4" />}
                  title="Check-In"
                  description="Log your weekly progress"
                />
              </m.div>
              <m.div variants={itemVariant}>
                <QuickLinkCard
                  to="/member/journey"
                  icon={<TrendingUp className="size-4" />}
                  title="My Journey"
                  description="View your strength progress"
                />
              </m.div>
            </m.div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
