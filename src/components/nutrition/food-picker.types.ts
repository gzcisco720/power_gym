import type { MacroSnapshot } from '@/lib/nutrition/macros';

export interface PickedFood {
  foodName: string;
  quantityG: number;
  macros: MacroSnapshot;
}

/** Serving option within a unified FoodEntry */
export interface FoodServing {
  id: string;
  label: string;
  grams: number;
  macros: Pick<MacroSnapshot, 'kcal' | 'protein' | 'carbs' | 'fat'> & {
    fiber?: number;
    sugar?: number;
    saturated?: number;
    polyunsaturated?: number;
    monounsaturated?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    transFat?: number;
    salt?: number;
    polyols?: number;
  };
}

/** Unified food shape emitted by FoodPicker to callers (e.g. FoodPickerDialog). */
export interface FoodEntry {
  source: 'fatsecret' | 'recent' | 'myfood';
  /** FatSecret food ID — present when source === 'fatsecret', used to fetch full serving list */
  foodId?: string;
  name: string;
  brand: string | null;
  servings: FoodServing[];
  defaultServingId: string;
}
