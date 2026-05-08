'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  dayCompleted: boolean;
  kcal: number;
  totalItems: number;
  onMarkComplete: () => void | Promise<void>;
  submitting: boolean;
}

export function DayCompleteBar({ dayCompleted, kcal, totalItems, onMarkComplete, submitting }: Props) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex items-center justify-between gap-3">
      <span className="text-xs text-foreground/65">
        {dayCompleted ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500 inline mr-1" />
            Day completed · {kcal} kcal
          </>
        ) : (
          <>
            {kcal} kcal · {totalItems} {totalItems === 1 ? 'item' : 'items'} logged
          </>
        )}
      </span>
      <Button
        onClick={() => void onMarkComplete()}
        disabled={dayCompleted || submitting}
        variant={dayCompleted ? 'outline' : 'default'}
      >
        {dayCompleted ? 'Day completed ✓' : 'Mark day complete'}
      </Button>
    </div>
  );
}
