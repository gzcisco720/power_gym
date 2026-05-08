'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
}

export function SelfNutritionDayViewWithRouter({ initialDate }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`/trainer/my-nutrition?date=${d}`, { scroll: false });
    },
    [router],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={onDateChange}
    />
  );
}
