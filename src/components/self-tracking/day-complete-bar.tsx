'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  dayCompleted: boolean;
  kcal: number;
  totalItems: number;
  onRequestComplete: () => void;
  submitting: boolean;
}

export function DayCompleteBar({ dayCompleted, kcal, totalItems, onRequestComplete, submitting }: Props) {
  return (
    <div className="sticky bottom-0 pt-8 pb-3 bg-gradient-to-t from-background from-60% to-transparent flex items-center justify-between gap-3 pointer-events-none [&>*]:pointer-events-auto">
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
        onClick={onRequestComplete}
        disabled={dayCompleted || submitting}
        variant={dayCompleted ? 'outline' : 'default'}
      >
        {dayCompleted ? 'Day completed ✓' : 'Mark day complete'}
      </Button>
    </div>
  );
}
