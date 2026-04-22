'use client';

import { useState } from 'react';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import { calculateMacros } from '@/lib/nutrition/macros';

interface FoodOption {
  _id: string;
  name: string;
  per100g: { kcal: number; protein: number; carbs: number; fat: number } | null;
  perServing: { servingLabel: string; grams: number; kcal: number; protein: number; carbs: number; fat: number } | null;
}

interface MealItemLocal {
  foodId: string;
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealLocal {
  name: string;
  order: number;
  items: MealItemLocal[];
}

interface DayTypeLocal {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: MealLocal[];
}

interface FormData {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

interface Props {
  initialData?: {
    name: string;
    description: string | null;
    dayTypes: IDayType[];
  };
  onSubmit: (data: FormData) => Promise<void>;
  foods: FoodOption[];
}

export function NutritionTemplateForm({ initialData, onSubmit, foods }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<DayTypeLocal[]>(
    initialData?.dayTypes?.map((d) => ({
      name: d.name,
      targetKcal: d.targetKcal,
      targetProtein: d.targetProtein,
      targetCarbs: d.targetCarbs,
      targetFat: d.targetFat,
      meals: d.meals.map((m) => ({
        name: m.name,
        order: m.order,
        items: m.items.map((item) => ({
          foodId: String(item.foodId),
          foodName: item.foodName,
          quantityG: item.quantityG,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      })),
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');

  function addDayType() {
    setDayTypes([
      ...dayTypes,
      { name: '', targetKcal: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0, meals: [] },
    ]);
  }

  function updateDayType(index: number, patch: Partial<DayTypeLocal>) {
    const updated = [...dayTypes];
    updated[index] = { ...updated[index], ...patch };
    setDayTypes(updated);
  }

  function removeDayType(index: number) {
    setDayTypes(dayTypes.filter((_, i) => i !== index));
  }

  function addMeal(dayIndex: number) {
    const day = dayTypes[dayIndex];
    const newMeal: MealLocal = { name: '', order: day.meals.length + 1, items: [] };
    updateDayType(dayIndex, { meals: [...day.meals, newMeal] });
  }

  function updateMealName(dayIndex: number, mealIndex: number, value: string) {
    const updated = [...dayTypes];
    updated[dayIndex].meals[mealIndex].name = value;
    setDayTypes(updated);
  }

  function addFoodToMeal(dayIndex: number, mealIndex: number, food: FoodOption, quantityG: number) {
    const macros = calculateMacros(food, quantityG);
    const item: MealItemLocal = {
      foodId: food._id,
      foodName: food.name,
      quantityG,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
    const updated = [...dayTypes];
    updated[dayIndex].meals[mealIndex].items = [
      ...updated[dayIndex].meals[mealIndex].items,
      item,
    ];
    setDayTypes(updated);
  }

  const filteredFoods = foodSearch
    ? foods.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : foods.slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        description: description || null,
        dayTypes: dayTypes as unknown as IDayType[],
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <label htmlFor="plan-name" className="text-sm font-medium">
          计划名称
        </label>
        <input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="plan-desc" className="text-sm font-medium">
          描述
        </label>
        <textarea
          id="plan-desc"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">天类型</h2>
          <button
            type="button"
            onClick={addDayType}
            className="text-sm text-primary hover:underline"
          >
            + 添加天类型
          </button>
        </div>

        {dayTypes.map((day, di) => (
          <div key={di} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                placeholder="如：训练日"
                value={day.name}
                onChange={(e) => updateDayType(di, { name: e.target.value })}
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeDayType(di)}
                className="text-sm text-destructive"
              >
                删除
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                ['targetKcal', 'targetProtein', 'targetCarbs', 'targetFat'] as const
              ).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {field === 'targetKcal'
                      ? '千卡'
                      : field === 'targetProtein'
                        ? '蛋白质(g)'
                        : field === 'targetCarbs'
                          ? '碳水(g)'
                          : '脂肪(g)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={day[field]}
                    onChange={(e) =>
                      updateDayType(di, { [field]: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">餐食</span>
                <button
                  type="button"
                  onClick={() => addMeal(di)}
                  className="text-xs text-primary hover:underline"
                >
                  + 添加餐食
                </button>
              </div>

              {day.meals.map((meal, mi) => (
                <div key={mi} className="rounded-md border p-3 space-y-2">
                  <input
                    placeholder="如：早餐"
                    value={meal.name}
                    onChange={(e) => updateMealName(di, mi, e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  {meal.items.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {meal.items.map((item, ii) => (
                        <li key={ii} className="text-muted-foreground">
                          {item.foodName} {item.quantityG}g — {item.kcal.toFixed(0)} kcal
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      placeholder="搜索食物"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="flex-1 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                    {filteredFoods.length > 0 && foodSearch && (
                      <select
                        className="rounded-md border px-2 py-1 text-xs"
                        onChange={(e) => {
                          const food = foods.find((f) => f._id === e.target.value);
                          if (food) addFoodToMeal(di, mi, food, 100);
                          setFoodSearch('');
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          选择食物
                        </option>
                        {filteredFoods.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
