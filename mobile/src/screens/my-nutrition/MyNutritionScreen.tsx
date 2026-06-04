import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen } from '../../components/Screen';
import { useNutritionStore } from '../../stores/nutrition.store';
import { MacroSummary } from './components/MacroSummary';
import { MealCard } from './components/MealCard';

export function MyNutritionScreen() {
  const plan = useNutritionStore((s) => s.plan);
  const todayLog = useNutritionStore((s) => s.todayLog);
  const summary = useNutritionStore((s) => s.summary);
  const loading = useNutritionStore((s) => s.loading);
  const fetchToday = useNutritionStore((s) => s.fetchToday);

  useEffect(() => {
    void fetchToday();
  }, [fetchToday]);

  return (
    <Screen testID="screen-MyNutrition">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Nutrition
          </Text>
          {plan ? (
            <Text className="mt-0.5 text-[12px] text-foreground/65">{plan.name}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <View key={i} className="rounded-xl bg-muted h-16 opacity-60" />
            ))}
          </View>
        </ScrollView>
      ) : plan === null ? (
        <View testID="my-nutrition-empty" className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] font-semibold text-foreground text-center">
            No nutrition plan assigned
          </Text>
          <Text className="text-[13px] text-foreground/65 text-center mt-1">
            Ask your trainer to assign a nutrition plan.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Macro summary */}
          {summary ? (
            <MacroSummary logged={summary.logged} target={summary.target} />
          ) : null}

          {/* Day type label */}
          {todayLog ? (
            <View
              testID={`nutrition-day-type-${todayLog.dayTypeName}`}
              className="mx-4 mt-4 mb-1"
            >
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                {todayLog.dayTypeName}
              </Text>
            </View>
          ) : null}

          {/* Meal cards */}
          <View className="px-4 pb-24 gap-2">
            {(todayLog?.meals ?? []).map((meal) => (
              <MealCard key={`${meal.name}-${meal.order}`} meal={meal} />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
