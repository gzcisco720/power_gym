'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface Props {
  meal: IDailyLogMeal;
  locked: boolean;
  onAddFood: () => void;
  onToggleComplete: () => void;
  onRemoveItem: (idx: number) => void;
}

export function MealCard({ meal, locked, onAddFood, onToggleComplete, onRemoveItem }: Props): JSX.Element {
  const totals = meal.items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Card className="p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">{meal.name}</h3>
        <span className="text-xs text-muted-foreground">
          {totals.kcal.toFixed(0)} kcal · {totals.protein.toFixed(1)}P · {totals.carbs.toFixed(1)}C · {totals.fat.toFixed(1)}F
        </span>
      </div>
      <ul className="divide-y text-sm">
        {meal.items.map((i, idx) => (
          <li key={`${i.foodName}-${idx}`} className="py-1 flex justify-between items-center">
            <span>{i.foodName} <span className="text-muted-foreground">({i.quantityG}g)</span></span>
            <span className="flex gap-3 items-center">
              <span className="text-muted-foreground">{i.kcal.toFixed(0)} · {i.protein.toFixed(1)}P · {i.carbs.toFixed(1)}C · {i.fat.toFixed(1)}F</span>
              {!locked && (
                <Button variant="ghost" size="sm" onClick={() => onRemoveItem(idx)}>×</Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onAddFood} disabled={locked}>+ Add Food</Button>
        <Button variant={meal.completed ? 'secondary' : 'default'} size="sm" onClick={onToggleComplete} disabled={locked}>
          {meal.completed ? '✓ Completed' : 'Complete'}
        </Button>
      </div>
    </Card>
  );
}
