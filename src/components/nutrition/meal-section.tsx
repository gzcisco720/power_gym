'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface Props {
  meal: IDailyLogMeal;
  locked: boolean;
  addFoodHref: string;
  onToggleComplete: () => void;
  onRemoveItem: (idx: number) => void;
}

interface MacroBar {
  label: string;
  actual: number;
  target: number;
  unit: string;
  color: string;
}

function MiniProgressBar({ actual, target, unit, color }: Omit<MacroBar, 'label'>) {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const isKcal = unit === 'kcal';
  const actualStr = isKcal ? actual.toFixed(0) : actual.toFixed(1);
  const targetStr = isKcal ? target.toFixed(0) : target.toFixed(0);

  return (
    <div className="flex-1 space-y-0.5">
      <span className={`text-xs font-medium ${color}`}>
        {actualStr}/{targetStr}{unit}
      </span>
      <div className="h-1 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MealSection({ meal, locked, addFoodHref, onToggleComplete, onRemoveItem }: Props) {
  const totals = meal.items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const hasTargets =
    meal.targetKcal > 0 ||
    meal.targetProtein > 0 ||
    meal.targetCarbs > 0 ||
    meal.targetFat > 0;

  const macroBars: MacroBar[] = [
    { label: 'Kcal', actual: totals.kcal, target: meal.targetKcal, unit: 'kcal', color: 'text-blue-500' },
    { label: 'Protein', actual: totals.protein, target: meal.targetProtein, unit: 'g', color: 'text-emerald-500' },
    { label: 'Carbs', actual: totals.carbs, target: meal.targetCarbs, unit: 'g', color: 'text-amber-500' },
    { label: 'Fat', actual: totals.fat, target: meal.targetFat, unit: 'g', color: 'text-pink-500' },
  ];

  return (
    <Card className="p-3 space-y-2">
      <h3 className="font-medium text-sm">{meal.name}</h3>

      {hasTargets && (
        <div className="flex gap-2">
          {macroBars.map(({ label, actual, target, unit, color }) => (
            <MiniProgressBar
              key={label}
              actual={actual}
              target={target}
              unit={unit}
              color={color}
            />
          ))}
        </div>
      )}

      <ul className="divide-y text-sm">
        {meal.items.map((item, idx) => (
          <li key={`${item.foodName}-${idx}`} className="py-1 flex justify-between items-start">
            <div>
              <div>{item.foodName}</div>
              <div className="text-xs text-muted-foreground">{item.quantityG} g</div>
            </div>
            <span className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">
                {item.kcal.toFixed(0)} · {item.protein.toFixed(1)}P · {item.carbs.toFixed(1)}C · {item.fat.toFixed(1)}F
              </span>
              {!locked && (
                <Button variant="ghost" size="sm" onClick={() => onRemoveItem(idx)}>×</Button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center">
        <Link
          href={addFoodHref}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          + Add Food
        </Link>
        <Button
          variant={meal.completed ? 'secondary' : 'default'}
          size="sm"
          onClick={onToggleComplete}
          disabled={locked}
        >
          {meal.completed ? '✓ Completed' : 'Complete'}
        </Button>
      </div>
    </Card>
  );
}
