export interface MacroSnapshot {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodMacroSource {
  per100g: { kcal: number; protein: number; carbs: number; fat: number } | null;
  perServing: { servingLabel: string; grams: number; kcal: number; protein: number; carbs: number; fat: number } | null;
}

export function calculateMacros(food: FoodMacroSource, quantityG: number): MacroSnapshot {
  if (quantityG === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  if (food.per100g) {
    const ratio = quantityG / 100;
    return {
      kcal: food.per100g.kcal * ratio,
      protein: food.per100g.protein * ratio,
      carbs: food.per100g.carbs * ratio,
      fat: food.per100g.fat * ratio,
    };
  }

  const serving = food.perServing!;
  const ratio = quantityG / serving.grams;
  return {
    kcal: serving.kcal * ratio,
    protein: serving.protein * ratio,
    carbs: serving.carbs * ratio,
    fat: serving.fat * ratio,
  };
}
