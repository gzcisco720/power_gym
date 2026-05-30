import type { MacroSnapshot } from '@/lib/nutrition/macros';

export interface PickedFood {
  foodName: string;
  quantityG: number;
  macros: MacroSnapshot;
}
