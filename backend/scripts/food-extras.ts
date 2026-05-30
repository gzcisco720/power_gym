/**
 * Per-100g extended macros for foods used in seed scripts.
 *
 * Values are typical USDA / standard nutrition-label numbers, used to enrich
 * seed meal items so the macro carousel "Extended" page shows realistic
 * micronutrient breakdowns instead of all zeros.
 */

export interface ExtendedExtras {
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  cholesterol?: number;
  sodium?: number;
}

// Shared constants — multiple foodName aliases reference the same data
const ROLLED_OATS: ExtendedExtras = {
  fiber: 10.6, sugar: 1.0, saturated: 1.2, polyunsaturated: 2.5, monounsaturated: 2.2, sodium: 2,
};
const CHICKEN_BREAST: ExtendedExtras = {
  saturated: 1.0, polyunsaturated: 0.8, monounsaturated: 1.2, sodium: 60, cholesterol: 73,
};
const ALMONDS: ExtendedExtras = {
  fiber: 12.5, sugar: 4.4, saturated: 3.8, polyunsaturated: 12.3, monounsaturated: 31.6, sodium: 1,
};
const WHEY: ExtendedExtras = {
  sugar: 1.5, saturated: 1.0, polyunsaturated: 0.3, monounsaturated: 0.4, cholesterol: 25, sodium: 200,
};

export const FOOD_EXTRAS_PER_100G: Record<string, ExtendedExtras> = {
  'Rolled Oats': ROLLED_OATS,
  'Woolworths Rolled Oats': ROLLED_OATS,
  'Whole Egg': {
    sugar: 1.1, saturated: 3.1, polyunsaturated: 1.4, monounsaturated: 4.1, cholesterol: 373, sodium: 124,
  },
  'White Rice': {
    fiber: 1.3, sugar: 0.1, saturated: 0.2, polyunsaturated: 0.2, monounsaturated: 0.2, sodium: 1,
  },
  'Brown Rice': {
    fiber: 3.5, sugar: 0.9, saturated: 0.6, polyunsaturated: 1.0, monounsaturated: 1.2, sodium: 4,
  },
  'Chicken Breast': CHICKEN_BREAST,
  'Coles Chicken Breast': CHICKEN_BREAST,
  'Coles Chicken Breast 100g Pack': CHICKEN_BREAST,
  'Tip Top Wholemeal Bread': {
    fiber: 5.7, sugar: 4.0, saturated: 0.7, polyunsaturated: 1.5, monounsaturated: 1.0, sodium: 390, salt: 0.98,
  },
  'Bega Cheese': {
    sugar: 0.1, saturated: 21, polyunsaturated: 0.9, monounsaturated: 9.4, cholesterol: 100, sodium: 650, salt: 1.6,
  },
  'Almonds': ALMONDS,
  'Premium Almonds': ALMONDS,
  'Blueberries': {
    fiber: 2.4, sugar: 10, polyunsaturated: 0.1, sodium: 1,
  },
  'Greek Yoghurt': {
    sugar: 4.0, saturated: 2.3, polyunsaturated: 0.1, monounsaturated: 1.1, cholesterol: 13, sodium: 36,
  },
  'Mixed Greens': {
    fiber: 1.8, sugar: 1.2, saturated: 0.1, polyunsaturated: 0.1, sodium: 28,
  },
  'Reset Whey Protein': WHEY,
  'Whey Protein': WHEY,
  'Salmon Fillet': {
    saturated: 3.0, polyunsaturated: 3.9, monounsaturated: 4.3, cholesterol: 55, sodium: 44,
  },
  'Sweet Potato': {
    fiber: 3.0, sugar: 4.2, sodium: 55,
  },
  'Tuna': {
    saturated: 0.3, polyunsaturated: 0.4, monounsaturated: 0.2, cholesterol: 36, sodium: 247,
  },
  'Vegemite': {
    fiber: 4.4, sugar: 2.0, polyunsaturated: 0.3, sodium: 3450, salt: 8.6,
  },
  'MCT Oil': {
    saturated: 92, sodium: 0,
  },
};

const EXTRA_KEYS: (keyof ExtendedExtras)[] = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'cholesterol', 'sodium',
];

export interface MealItemSeed {
  foodName: string;
  quantityG: number;
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
  cholesterol?: number;
  sodium?: number;
}

/**
 * Enrich a seed meal item with extended macros scaled by quantityG.
 * Existing values on the item are preserved (caller-set fields win).
 * Falls through unchanged if the foodName isn't in the lookup table.
 */
export function withExtras(item: MealItemSeed): MealItemSeed {
  const extras = FOOD_EXTRAS_PER_100G[item.foodName];
  if (!extras) return item;
  const ratio = item.quantityG / 100;
  const result: MealItemSeed = { ...item };
  for (const k of EXTRA_KEYS) {
    if (result[k] !== undefined) continue;
    const v = extras[k];
    if (typeof v === 'number') {
      result[k] = Math.round(v * ratio * 10) / 10;
    }
  }
  return result;
}
