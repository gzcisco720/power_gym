'use client';

import { useMemo } from 'react';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { FoodEntry } from './food-picker.types';

export function useMacroPreview(
  entry: FoodEntry | null,
  servingId: string,
  qty: number,
): MacroSnapshot | null {
  return useMemo(() => {
    if (!entry) return null;
    const serving = entry.servings.find((s) => s.id === servingId) ?? entry.servings[0];
    if (!serving) return null;
    const ratio = qty;
    return {
      kcal: serving.macros.kcal * ratio,
      protein: serving.macros.protein * ratio,
      carbs: serving.macros.carbs * ratio,
      fat: serving.macros.fat * ratio,
    };
  }, [entry, servingId, qty]);
}
