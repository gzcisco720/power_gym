import { DayType, FoodMacros } from '../types/nutrition-templates';

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function dayTypeTotals(dayType: DayType): MacroTotals {
  const totals: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of dayType.meals) {
    for (const item of meal.items) {
      totals.kcal += item.kcal;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fat += item.fat;
    }
  }
  return totals;
}

export function scaleMacros(per100g: FoodMacros, quantityG: number): MacroTotals {
  const factor = quantityG / 100;
  return {
    kcal: Math.round(per100g.kcal * factor),
    protein: Math.round(per100g.protein * factor),
    carbs: Math.round(per100g.carbs * factor),
    fat: Math.round(per100g.fat * factor),
  };
}
