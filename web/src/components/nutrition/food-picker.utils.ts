import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { FoodEntry, PickedFood } from './food-picker.types';

export function computePickedFood(entry: FoodEntry, servingId: string, qty: number): PickedFood {
  const serving = entry.servings.find((s) => s.id === servingId) ?? entry.servings[0];
  const ratio = qty;
  const macros: MacroSnapshot = {
    kcal: serving.macros.kcal * ratio,
    protein: serving.macros.protein * ratio,
    carbs: serving.macros.carbs * ratio,
    fat: serving.macros.fat * ratio,
  };
  if (serving.macros.fiber !== undefined) macros.fiber = serving.macros.fiber * ratio;
  if (serving.macros.sugar !== undefined) macros.sugar = serving.macros.sugar * ratio;
  if (serving.macros.saturated !== undefined) macros.saturated = serving.macros.saturated * ratio;
  if (serving.macros.polyunsaturated !== undefined) macros.polyunsaturated = serving.macros.polyunsaturated * ratio;
  if (serving.macros.monounsaturated !== undefined) macros.monounsaturated = serving.macros.monounsaturated * ratio;
  if (serving.macros.cholesterol !== undefined) macros.cholesterol = serving.macros.cholesterol * ratio;
  if (serving.macros.sodium !== undefined) macros.sodium = serving.macros.sodium * ratio;
  if (serving.macros.potassium !== undefined) macros.potassium = serving.macros.potassium * ratio;
  if (serving.macros.transFat !== undefined) macros.transFat = serving.macros.transFat * ratio;

  const foodName = entry.brand ? `${entry.brand} ${entry.name}` : entry.name;
  return { foodName, quantityG: serving.grams * ratio, macros };
}
