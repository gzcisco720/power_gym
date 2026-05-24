'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

export function NutritionCalendarHeaderTrigger({ basePath }: { basePath: BasePath }) {
  const router = useRouter();

  function dayPath(date: string): string {
    if (basePath === '/member/nutrition') return `/member/nutrition/day?date=${date}`;
    return `${basePath}/day?date=${date}`;
  }

  return (
    <NutritionCalendarPopover
      onSelect={(date) => router.push(dayPath(date))}
      trigger={
        <button
          aria-label="Open calendar"
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="size-4" />
        </button>
      }
    />
  );
}
