export interface MacroSnapshot {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
}

interface BaseMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ExtendedMacros extends BaseMacros {
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
}

interface FoodMacroSource {
  per100g: ExtendedMacros | null;
  perServing: (ExtendedMacros & { servingLabel: string; grams: number }) | null;
}

const OPTIONAL_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated', 'polyols',
] as const;

function scaleOptional(source: ExtendedMacros, ratio: number, target: MacroSnapshot): void {
  for (const key of OPTIONAL_KEYS) {
    const v = source[key];
    if (typeof v === 'number') target[key] = v * ratio;
  }
}

export function calculateMacros(food: FoodMacroSource, quantityG: number): MacroSnapshot {
  if (quantityG === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const source: ExtendedMacros = food.per100g ?? food.perServing!;
  const ratio = food.per100g
    ? quantityG / 100
    : quantityG / food.perServing!.grams;

  const result: MacroSnapshot = {
    kcal: source.kcal * ratio,
    protein: source.protein * ratio,
    carbs: source.carbs * ratio,
    fat: source.fat * ratio,
  };
  scaleOptional(source, ratio, result);
  return result;
}
