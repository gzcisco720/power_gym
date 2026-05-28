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
    <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
        <span className="text-xs text-foreground/65">
          {dayCompleted ? (
            <>
              <Check className="size-3.5 text-emerald-500 inline mr-1" />
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
    </div>
  );
}
