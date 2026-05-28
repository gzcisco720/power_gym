'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalMeals: number;
  completedMeals: number;
  sealedKcal: number;
  totalKcal: number;
  onConfirm: (opts: { markAll: boolean }) => void | Promise<void>;
  submitting: boolean;
}

export function DayCompleteConfirmDialog({
  open,
  onOpenChange,
  totalMeals,
  completedMeals,
  sealedKcal,
  totalKcal,
  onConfirm,
  submitting,
}: Props) {
  const allCompleted = totalMeals > 0 && completedMeals === totalMeals;
  const noneCompleted = completedMeals === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark today as complete?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-foreground/80">
          {allCompleted && (
            <p>
              {totalKcal} kcal across {totalMeals} {totalMeals === 1 ? 'meal' : 'meals'} ready to submit.
            </p>
          )}
          {!allCompleted && (
            <>
              <p>
                {completedMeals} of {totalMeals} {totalMeals === 1 ? 'meal' : 'meals'} completed
                {!noneCompleted && <> ({sealedKcal} kcal)</>}.
              </p>
              {!noneCompleted && (
                <p className="text-foreground/65 text-xs">
                  {totalMeals - completedMeals}{' '}
                  {totalMeals - completedMeals === 1 ? 'meal not marked complete and will' : 'meals not marked complete and will'}{' '}
                  not count.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {allCompleted ? (
            <Button onClick={() => void onConfirm({ markAll: false })} disabled={submitting}>
              Complete Day
            </Button>
          ) : (
            <>
              <Button onClick={() => void onConfirm({ markAll: true })} disabled={submitting}>
                Mark all &amp; submit ({totalKcal} kcal)
              </Button>
              {!noneCompleted && (
                <Button
                  onClick={() => void onConfirm({ markAll: false })}
                  disabled={submitting}
                  variant="outline"
                >
                  Submit completed only ({sealedKcal} kcal)
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
