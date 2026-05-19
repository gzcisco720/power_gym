import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface DayTypeMacroTargets {
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export function computeDayTypeTargets(dt: IDayType): DayTypeMacroTargets {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const m of dt.meals) {
    for (const i of m.items) {
      kcal += i.kcal;
      protein += i.protein;
      carbs += i.carbs;
      fat += i.fat;
    }
  }
  return {
    targetKcal: Math.round(kcal),
    targetProtein: Math.round(protein),
    targetCarbs: Math.round(carbs),
    targetFat: Math.round(fat),
  };
}
