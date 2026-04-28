'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';

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
  if (!plan) {
    return (
      <div>
        <PageHeader title="Nutrition Plan" />
        <div className="px-4 sm:px-8 py-28">
          <EmptyState
            heading="No nutrition plan assigned"
            description="Your trainer hasn't assigned a nutrition plan yet. Check back soon."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nutrition Plan" subtitle={plan.name} />

      <div className="px-4 sm:px-8 py-7">
        <Tabs defaultValue={plan.dayTypes[0]?.name ?? ''}>
          <TabsList className="mb-6 bg-[#0c0c0c] border border-[#141414] rounded-lg p-1 h-auto w-auto">
            {plan.dayTypes.map((dt) => (
              <TabsTrigger
                key={dt.name}
                value={dt.name}
                className="text-[11px] font-semibold rounded-md px-3 py-1.5 data-active:bg-white data-active:text-black text-[#888]"
              >
                {dt.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {plan.dayTypes.map((dt) => {
            const sortedMeals = [...dt.meals].sort((a, b) => a.order - b.order);
            return (
              <TabsContent key={dt.name} value={dt.name} className="space-y-6">
                <div>
                  <SectionHeader title="Daily Targets" />
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <StatCard label="Calories" value={String(dt.targetKcal)} unit="kcal" />
                    <StatCard label="Protein" value={String(dt.targetProtein)} unit="g" />
                    <StatCard label="Carbs" value={String(dt.targetCarbs)} unit="g" />
                    <StatCard label="Fat" value={String(dt.targetFat)} unit="g" />
                  </div>
                </div>

                {sortedMeals.length > 0 && (
                  <div className="space-y-3">
                    <SectionHeader title="Meals" />
                    {sortedMeals.map((meal, mi) => (
                      <Card key={mi} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
                        <div className="text-[13px] font-semibold text-white mb-3">{meal.name}</div>
                        {meal.items.length === 0 ? (
                          <p className="text-[11px] text-[#777]">No foods added</p>
                        ) : (
                          <div className="space-y-2">
                            {meal.items.map((item, ii) => (
                              <div key={ii} className="flex items-center justify-between">
                                <span className="text-[12px] text-[#666]">{item.foodName}</span>
                                <div className="flex items-center gap-3 text-[10px] text-[#777]">
                                  <span>{item.quantityG}g</span>
                                  <span>{item.kcal.toFixed(0)} kcal</span>
                                  <span>P {item.protein.toFixed(1)}g</span>
                                  <span>C {item.carbs.toFixed(1)}g</span>
                                  <span>F {item.fat.toFixed(1)}g</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
