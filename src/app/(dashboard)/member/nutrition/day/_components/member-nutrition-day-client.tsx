'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';
import type { PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';

interface Props {
  memberId: string;
  initialDate: string;
  mode: 'plan' | 'free';
  forceDayType: string | undefined;
  planDayTypes: PlanDayType[];
}

export function MemberNutritionDayClient({ memberId, initialDate, mode, forceDayType, planDayTypes }: Props) {
  const { push } = useRouter();
  const onPlanDateChange = useCallback(
    (d: string) => {
      push(`/member/nutrition/day?date=${d}&mode=plan`, { scroll: false });
    },
    [push],
  );

  if (mode === 'free') {
    return (
      <SelfNutritionDayView
        key={initialDate}
        initialDate={initialDate}
        noDateNav
        planDayTypes={planDayTypes}
      />
    );
  }

  return (
    <DailyNutritionView
      memberId={memberId}
      initialDate={initialDate}
      forceDayType={forceDayType}
      planDayTypes={planDayTypes}
      onDateChange={onPlanDateChange}
    />
  );
}
