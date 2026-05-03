'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/shared/section-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: { exerciseName: string }[];
}

interface Plan {
  _id: string;
  name: string;
  days: PlanDay[];
}

interface PlanOverviewProps {
  plan: Plan | null;
  sessionBasePath?: string;
}

export function PlanOverview({ plan, sessionBasePath = '/member/plan' }: PlanOverviewProps) {
  const shouldReduce = useReducedMotion();

  if (!plan) {
    return (
      <div className="px-4 sm:px-8 py-28">
        <EmptyState
          heading="No plan assigned"
          description="Your trainer hasn't assigned a training plan yet. Check back soon."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Training Plan" subtitle={plan.name} />

      <div className="px-4 sm:px-8 py-7 space-y-6">
        <div>
          <SectionHeader title="Training Days" />
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {plan.days.map((day, i) => (
              <motion.div
                key={day.dayNumber}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04, duration: 0.15 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-[10px] p-4 hover:border-[#2a2a2a] transition-colors">
                  <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#555] mb-1">
                    DAY {String(day.dayNumber).padStart(2, '0')}
                  </div>
                  <div className="text-[13px] font-semibold text-white">{day.name}</div>
                  <div className="mt-1 text-[10px] text-[#666]">
                    {day.exercises.length} exercises
                  </div>
                  <a
                    href={`${sessionBasePath}/session/new?day=${day.dayNumber}`}
                    className="mt-3 flex w-full items-center justify-center rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-black hover:bg-white/90 transition-all"
                  >
                    Start Session
                  </a>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
