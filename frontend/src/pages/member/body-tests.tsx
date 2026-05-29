import { useEffect } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { variants } from '@/lib/animations/variants';

function SkeletonRow() {
  return <div className="h-[68px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />;
}

function BodyTestCard({ test }: { test: { _id: string; protocol: string; date: string; bodyFatPct: number; leanMassKg: number; fatMassKg: number; weight: number } }) {
  return (
    <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{test.protocol.toUpperCase()}</span>
        <span className="text-xs text-foreground/65">{test.date.slice(0, 10)}</span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-foreground/65">
        <span>Body fat: <span className="font-semibold text-primary-light">{test.bodyFatPct.toFixed(1)}%</span></span>
        <span>Lean: <span className="font-semibold text-foreground/80">{test.leanMassKg.toFixed(1)} kg</span></span>
        <span>Fat: <span className="font-semibold text-foreground/80">{test.fatMassKg.toFixed(1)} kg</span></span>
      </div>
    </div>
  );
}

export function MemberBodyTestsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { testsByMember, isLoading, fetchTests } = useBodyTestsStore();

  const memberId = user?.id ?? '';
  const tests = testsByMember[memberId] ?? [];

  useEffect(() => {
    if (memberId && !(memberId in testsByMember)) void fetchTests(memberId);
  }, [memberId, testsByMember, fetchTests]);

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Body Composition Tests" subtitle="Skinfold measurement history" />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!isLoading && tests.length === 0 && (
          <EmptyState
            heading="No tests recorded yet"
            description="Your trainer will add body composition tests to track your progress over time."
          />
        )}

        {!isLoading && tests.length > 0 && (
          <m.div
            className="space-y-1.5"
            variants={shouldReduceMotion ? undefined : variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {tests.map((t) => (
              <m.div
                key={t._id}
                variants={shouldReduceMotion ? undefined : variants.staggerItem}
              >
                <BodyTestCard test={t} />
              </m.div>
            ))}
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}
