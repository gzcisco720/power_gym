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
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      // Navigate without locking mode so the server resolves the right view for that date.
      // (Preserving mode would show an empty freestyle view on days that only have plan logs.)
      router.push(`/member/nutrition/day?date=${d}`, { scroll: false });
    },
    [router],
  );

  if (mode === 'free') {
    return (
      <SelfNutritionDayView
        key={initialDate}
        initialDate={initialDate}
        onDateChange={onDateChange}
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
      onDateChange={onDateChange}
    />
  );
}
