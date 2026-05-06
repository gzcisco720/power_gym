import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface TemplateOverview {
  dayTypeNames: string[];
  avgPerDay: { kcal: number; protein: number; carbs: number; fat: number } | null;
}

export function buildTemplateOverview(dayTypes: IDayType[]): TemplateOverview {
  const dayTypeNames = dayTypes.map((dt) => dt.name);
  if (dayTypes.length === 0) {
    return { dayTypeNames, avgPerDay: null };
  }

  let totalK = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;
  for (const dt of dayTypes) {
    for (const meal of dt.meals) {
      for (const item of meal.items) {
        totalK += item.kcal;
        totalP += item.protein;
        totalC += item.carbs;
        totalF += item.fat;
      }
    }
  }

  return {
    dayTypeNames,
    avgPerDay: {
      kcal: Math.round(totalK / dayTypes.length),
      protein: Math.round(totalP / dayTypes.length),
      carbs: Math.round(totalC / dayTypes.length),
      fat: Math.round(totalF / dayTypes.length),
    },
  };
}
