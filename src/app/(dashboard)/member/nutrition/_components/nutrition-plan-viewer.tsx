'use client';

import { useState } from 'react';

interface MealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  order: number;
  items: MealItem[];
}

interface DayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: Meal[];
}

interface Plan {
  _id: string;
  name: string;
  dayTypes: DayType[];
}

export function NutritionPlanViewer({ plan }: { plan: Plan | null }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!plan) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>暂无营养计划</p>
        <p className="text-sm mt-2">请联系您的教练分配营养计划</p>
      </div>
    );
  }

  const activeDayType = plan.dayTypes[activeIndex];
  const sortedMeals = [...(activeDayType?.meals ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{plan.name}</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {plan.dayTypes.map((dt, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted'
            }`}
          >
            {dt.name}
          </button>
        ))}
      </div>

      {activeDayType && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg border p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetKcal}</p>
              <p className="text-xs text-muted-foreground">千卡</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetProtein}</p>
              <p className="text-xs text-muted-foreground">蛋白质(g)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetCarbs}</p>
              <p className="text-xs text-muted-foreground">碳水(g)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetFat}</p>
              <p className="text-xs text-muted-foreground">脂肪(g)</p>
            </div>
          </div>

          <div className="space-y-4">
            {sortedMeals.map((meal, mi) => (
              <div key={mi} className="rounded-lg border p-4">
                <h2 className="font-semibold mb-3">{meal.name}</h2>
                {meal.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无食物</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-1 pr-4">食物</th>
                        <th className="py-1 pr-4">克数</th>
                        <th className="py-1 pr-4">千卡</th>
                        <th className="py-1 pr-4">蛋白质</th>
                        <th className="py-1 pr-4">碳水</th>
                        <th className="py-1">脂肪</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.items.map((item, ii) => (
                        <tr key={ii} className="border-b">
                          <td className="py-1 pr-4 font-medium">{item.foodName}</td>
                          <td className="py-1 pr-4">{item.quantityG}g</td>
                          <td className="py-1 pr-4">{item.kcal.toFixed(0)}</td>
                          <td className="py-1 pr-4">{item.protein.toFixed(1)}g</td>
                          <td className="py-1 pr-4">{item.carbs.toFixed(1)}g</td>
                          <td className="py-1">{item.fat.toFixed(1)}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
