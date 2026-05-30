import { Button } from '@/components/ui/button';

interface MealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  completed: boolean;
  items: MealItem[];
}

interface Props {
  meal: Meal;
  locked: boolean;
  onAddFood: () => void;
  onToggleComplete: () => void;
  onRemoveItem: (idx: number) => void;
}

export function MealSection({ meal, locked, onAddFood, onToggleComplete, onRemoveItem }: Props) {
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
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-2">
      <div className="flex justify-between items-baseline">
        <h3 className="text-sm font-medium">{meal.name}</h3>
        <span className="text-xs text-foreground/65 tabular-nums">
          {totals.kcal.toFixed(0)} kcal · {totals.protein.toFixed(1)}P · {totals.carbs.toFixed(1)}C
          · {totals.fat.toFixed(1)}F
        </span>
      </div>
      <ul className="divide-y divide-foreground/10 text-sm">
        {meal.items.map((i, idx) => (
          <li
            key={`${i.foodName}-${idx}`}
            className="py-1.5 grid grid-cols-[1fr_auto_auto] gap-2 items-center"
          >
            <div>
              <div className="text-sm">{i.foodName}</div>
              <div className="text-xs text-foreground/65">{i.quantityG}g</div>
            </div>
            <span className="text-foreground/65 tabular-nums text-xs">
              {i.kcal.toFixed(0)} · {i.protein.toFixed(1)}P · {i.carbs.toFixed(1)}C ·{' '}
              {i.fat.toFixed(1)}F
            </span>
            {!locked && (
              <Button variant="ghost" size="sm" onClick={() => onRemoveItem(idx)}>
                ×
              </Button>
            )}
          </li>
        ))}
        {meal.items.length === 0 && (
          <li className="py-2 text-xs text-foreground/65 text-center">No items</li>
        )}
      </ul>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onAddFood} disabled={locked}>
          + Add Food
        </Button>
        <Button
          variant={meal.completed ? 'outline' : 'default'}
          size="sm"
          onClick={onToggleComplete}
          disabled={locked}
        >
          {meal.completed ? '✓ Completed' : 'Complete'}
        </Button>
      </div>
    </div>
  );
}
