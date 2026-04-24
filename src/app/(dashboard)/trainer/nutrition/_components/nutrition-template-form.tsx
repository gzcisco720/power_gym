'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="plan-name"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
          >
            计划名称
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="plan-desc"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
          >
            描述
          </label>
          <textarea
            id="plan-desc"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white outline-none focus-visible:ring-1 focus-visible:ring-white resize-none"
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
            天类型
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={addDayType}
            className="border border-[#1a1a1a] text-[#444] hover:border-[#333] hover:text-[#888] text-xs"
          >
            + 添加天类型
          </Button>
        </div>

        {dayTypes.map((day, di) => (
          <Card key={di} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="如：训练日"
                value={day.name}
                onChange={(e) => updateDayType(di, { name: e.target.value })}
                className="flex-1 bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeDayType(di)}
                className="text-[#333] hover:text-red-400 hover:bg-[#141414] text-xs"
              >
                删除
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                ['targetKcal', 'targetProtein', 'targetCarbs', 'targetFat'] as const
              ).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
                    {field === 'targetKcal'
                      ? '千卡'
                      : field === 'targetProtein'
                        ? '蛋白质(g)'
                        : field === 'targetCarbs'
                          ? '碳水(g)'
                          : '脂肪(g)'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={day[field]}
                    onChange={(e) =>
                      updateDayType(di, { [field]: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#333]">餐食</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => addMeal(di)}
                  className="text-[#333] hover:text-[#888] text-xs"
                >
                  + 添加餐食
                </Button>
              </div>

              {day.meals.map((meal, mi) => (
                <Card key={mi} className="bg-[#111] border-[#1a1a1a] rounded-lg p-3 space-y-2">
                  <Input
                    placeholder="如：早餐"
                    value={meal.name}
                    onChange={(e) => updateMealName(di, mi, e.target.value)}
                    className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white text-xs"
                  />
                  {meal.items.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {meal.items.map((item, ii) => (
                        <li key={ii} className="text-[#444]">
                          {item.foodName} {item.quantityG}g — {item.kcal.toFixed(0)} kcal
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="搜索食物"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="flex-1 bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white text-xs"
                    />
                    {filteredFoods.length > 0 && foodSearch && (
                      <select
                        className="rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-2 py-1 text-xs text-white"
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
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </Button>
    </form>
  );
}
