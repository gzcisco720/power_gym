import type { NutritionTemplate } from '@/api/nutrition';

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Returns the average per-day macro totals across all dayTypes in a template.
 * Returns null when the template has no dayTypes.
 * All values are rounded to the nearest integer.
 */
export function averagePerDay(template: NutritionTemplate): MacroTotals | null {
  const { dayTypes } = template;
  if (dayTypes.length === 0) return null;

  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const day of dayTypes) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        totalKcal += item.kcal;
        totalProtein += item.protein;
        totalCarbs += item.carbs;
        totalFat += item.fat;
      }
    }
  }

  const count = dayTypes.length;
  return {
    kcal: Math.round(totalKcal / count),
    protein: Math.round(totalProtein / count),
    carbs: Math.round(totalCarbs / count),
    fat: Math.round(totalFat / count),
  };
}
