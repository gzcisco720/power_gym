'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';

interface Props {
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
}

export function NutritionCalendarHeaderTrigger({ basePath }: Props) {
  const router = useRouter();
  return (
    <NutritionCalendarPopover
      onSelect={(date) => router.push(`${basePath}?date=${date}`, { scroll: false })}
      trigger={
        <button
          aria-label="Open calendar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}
