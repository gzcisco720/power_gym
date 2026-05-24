interface MacroItem {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export function computeMacros(items: MacroItem[]): Macros {
  return items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      kcal: acc.kcal + item.kcal,
    }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  );
}
