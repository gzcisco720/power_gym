'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
  initialTemplateId?: string;
  initialDayTypeName?: string;
  noDateNav?: boolean;
}

export function SelfNutritionDayViewWithRouter({ initialDate, basePath, initialTemplateId, initialDayTypeName, noDateNav = false }: Props) {
  const { push } = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      push(`${basePath}/day?date=${d}`, { scroll: false });
    },
    [push, basePath],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={noDateNav ? undefined : onDateChange}
      initialTemplateId={initialTemplateId}
      initialDayTypeName={initialDayTypeName}
      noDateNav={noDateNav}
    />
  );
}
