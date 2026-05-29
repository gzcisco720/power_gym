import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Salad, Pencil } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { variants } from '@/lib/animations/variants';

interface NutritionPathCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  linkTo: string;
  linkLabel: string;
  accentClass: string;
}

function NutritionPathCard({
  icon,
  title,
  subtitle,
  description,
  linkTo,
  linkLabel,
  accentClass,
}: NutritionPathCardProps) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-foreground/65 mt-0.5">{subtitle}</div>
        </div>
      </div>
      <p className="text-xs text-foreground/65">{description}</p>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

export function MemberNutritionPage() {
  const { user } = useAuthStore();
  const { memberPlans, fetchMemberPlan, isLoading } = useNutritionStore();
  const reducedMotion = useReducedMotion();

  const memberId = user?.id ?? '';
  const memberPlan = memberPlans[memberId];
  const isPlanLoading = isLoading && !(memberId in memberPlans);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  const containerVariant = reducedMotion ? {} : variants.staggerContainer;
  const itemVariant = reducedMotion ? {} : variants.staggerItem;

  const planSubtitle = memberPlan
    ? memberPlan.nutritionTemplate.name
    : 'No plan assigned';

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-screen">
        <PageHeader title="My Nutrition" subtitle="Track your daily food intake" />

        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto w-full space-y-4">
          {isPlanLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
            </div>
          ) : (
            <m.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              variants={containerVariant}
              initial="hidden"
              animate="visible"
            >
              <m.div variants={itemVariant}>
                <NutritionPathCard
                  icon={<Salad className="size-5" />}
                  title="My Plan"
                  subtitle={planSubtitle}
                  description={
                    memberPlan
                      ? "Follow your trainer-assigned nutrition plan for today."
                      : "Ask your trainer to assign a nutrition plan."
                  }
                  linkTo={`/member/nutrition/day?date=${today}&mode=plan`}
                  linkLabel="View today"
                  accentClass="bg-primary/10 text-primary-light"
                />
              </m.div>
              <m.div variants={itemVariant}>
                <NutritionPathCard
                  icon={<Pencil className="size-5" />}
                  title="Freestyle"
                  subtitle="Log food freely"
                  description="Track any food without a plan. Add meals and items as you eat them."
                  linkTo={`/member/nutrition/day?date=${today}&mode=free`}
                  linkLabel="Log today"
                  accentClass="bg-emerald-500/10 text-emerald-400"
                />
              </m.div>
            </m.div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
