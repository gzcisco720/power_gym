'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
  initialTemplateId?: string;
  initialDayTypeName?: string;
}

export function SelfNutritionDayViewWithRouter({ initialDate, basePath, initialTemplateId, initialDayTypeName }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`${basePath}/day?date=${d}`, { scroll: false });
    },
    [router, basePath],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={onDateChange}
      initialTemplateId={initialTemplateId}
      initialDayTypeName={initialDayTypeName}
    />
  );
}
